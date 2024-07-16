import { MODULE_NAME } from "./consts.js";
import { registerSettings } from "./settings.js";
import { applyItems, fixEvolutionCost, getGrantedItems, hasGrantedItems } from "./util.js";
import { WelcomeWindow } from "./welcome.js";

Hooks.once("init", () => {
    registerSettings();
    game.summoner5e = {
        fixEvolutionCost
    };
});

Hooks.once("ready", () => {
    if (game.settings.get("summoner-class-for-5e", "showInstructions") === true) {
        game.summoner5e.welcome = new WelcomeWindow();
        game.summoner5e.welcome.render(true);
    }
});

Hooks.on("renderActorSheet", async (app, html, actor) => {
    const cost = actor.items.reduce((acc, item) => {
        const cost = parseInt(item.getFlag(MODULE_NAME, "cost")) || 0;
        console.log(`Cost: ${item.name} ${cost}`);
        return acc + cost;
    }, 0);

    const poolItem = actor.items.find(i => i.name.startsWith("Evolution Pool"));
    if (!poolItem || !actor.system.scale.eidolon) return;

    const total = actor.system.scale.eidolon["evolution-pool"]?.value || 0;
    const currentValue = total - cost;
    await poolItem.update({name: `Evolution Pool (Available: ${currentValue})`});
});

Hooks.on("createItem", async (item) => {  
    const actor = item.actor;
    const description = item.system.description?.value;

    if (!actor || !hasGrantedItems(description))
        return;    
    
    let items = await getGrantedItems(description);
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
});

Hooks.on("deleteItem", async(item) => 
{
    const actor = item.actor;
    if (!actor) return;
    const grantedItems = actor.items.filter(i => i.getFlag(MODULE_NAME, "source") === item._id);
    if (grantedItems && grantedItems.length)
    {
        console.log(`Deleting ${grantedItems.length} items granted by ${item.name}`);
        await actor.deleteEmbeddedDocuments("Item", grantedItems.map(i => i._id));
    }
});

Hooks.on("renderItemSheet", (app, html, args) => {
    const item = args.document;
    console.log(`Rendering item sheet for ${item.name}`);
    const cost = item.getFlag(MODULE_NAME, "cost");
    if (Number.isInteger(cost))
    {
        html.find(".item-properties").append(`<div class="property" id="epcost" style="margin-top: 0.5em; text-align: center;"><span>EP Cost: </span><input type="number" value=${cost} /></div>`);
        html.find("#epcost input").change(async (ev) => {
            const cost = parseInt(ev.target.value);
            await item.setFlag(MODULE_NAME, "cost", cost);
        });
    }
});