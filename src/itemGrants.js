import { MODULE_NAME } from "./consts.js";
import { evolutionHandlers } from "./evolutions.js";
const itemsInDescriptionRegex = "@UUID\\[(\\S+)\\]\\{([^\\}]+)\\}";

async function getGrantedItems(description)
{
    const matches = description.matchAll(new RegExp(itemsInDescriptionRegex, "g"));
    let items = [];
    for (const match of matches)
    {
        const fullId = match[1];
        const [ _, module, compendium, rest ] = fullId.split(".");
        const id = fullId.split(".").pop();
        const pack = game.packs.get(`${module}.${compendium}`);
        const item = await pack?.getDocument(id);
        if (item) 
        {
            items.push(item);
        } else {
            console.log(`Could not find item with id ${id}`);
        }
    }
    return items;
}

async function applyItems(actor, items, sourceId = "")
{
    const result = await actor.createEmbeddedDocuments('Item', items);
    if (sourceId)
    {
        for (const item of result)
        {
            await item.setFlag(MODULE_NAME, "source", sourceId);
        }
    }
    
    // configure the items to the actor
    for (const item of result)
    {
        const handler = evolutionHandlers[item.name];
        if (handler) await handler.configure(actor, item);
    }
    
    // configure the source item as well
    if (sourceId)
    {
        const sourceItem = await actor.items.get(sourceId);
        const handler = evolutionHandlers[sourceItem.name];
        if (handler) await handler.update(actor, sourceItem);
    }

    // notify user
    let names = result.map(i => i.name).join(", ");
    names = names.replace(/, $/, "");
    ui.notifications.info(`You have gained: ${names}.`);
    return result;
}

/// This function is used to handle items that are granted by an item
/// It will look for items in the description of the item and create them
/// as embedded items of the actor
export async function handleItemGrants(actor, item)
{
    if (!actor)
        return;    
    
    let items = await getGrantedItems(item.system.description?.value);
    if (!items || items.length === 0) return;

    const isBaseForm = item.name.indexOf("Base Form") >= 0;
    const sourceId = item._id;

    // if only a single item is granted or this is the base form, just create the item
    if (items.length === 1 || isBaseForm) 
    {
        const addedItems = await applyItems(actor, items, sourceId);
        // special rule: items granted by the base form are free
        if (isBaseForm)
        {
            for (const item of addedItems)
            {
                await item.setFlag(MODULE_NAME, "cost", 0);
                await item.setFlag(MODULE_NAME, "fromBaseform", true);
            }
        }
    } 
    else 
    // if multiple items are granted, show a dialog to select one
    {
        let buttons = "";
        for (const item of items)
            buttons += `<input name="spell" id="spellSel" type="radio" value="${item._id}" />${item.name}<br />`;
        
        // show the selection dialog
        new Dialog({
            title: "Select",
            content: `<p>This evolution grants you one item to choose from the following list:</p><p>${buttons}</p>`,
            buttons: {
                learn: {
                    label: "Learn",
                    callback: async (html) => {
                        const id = html.find("input:checked").val();
                        const item = items.find(i => i._id === id);
                        await applyItems(actor, [item], sourceId);
                    }
                }
            }
        }).render(true);            
    }
}

/// This function is used to remove items that were granted by a deleted item
export async function handleRemoveGrants(actor, item)
{
    if (!actor) return;
    const handler = evolutionHandlers[item.name];
    if (handler) await handler.unConfigure(actor, item);

    const grantedItems = actor.items.filter(i => i.getFlag(MODULE_NAME, "source") === item._id);

    if (grantedItems && grantedItems.length)
    {
        // unconfigure the items to the actor
        for (const item of grantedItems)
        {
            const handler = evolutionHandlers[item.name];
            if (handler) await handler.unConfigure(actor, item);
        }

        // delete the items
        console.log(`Deleting ${grantedItems.length} items granted by ${item.name}`);
        await actor.deleteEmbeddedDocuments("Item", grantedItems.map(i => i._id));    
    }
}   