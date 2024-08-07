import { MODULE_NAME } from "./consts.js";
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
    // set the source id. This allows us to remove the new items when the source item is removed
    if (sourceId)
    {
        result.forEach(async (item) => await item.setFlag(MODULE_NAME, "source", sourceId));
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
            addedItems.forEach(async (item) => await item.setFlag(MODULE_NAME, "cost", 0))
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
