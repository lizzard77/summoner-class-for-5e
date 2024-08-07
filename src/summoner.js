import { MODULE_NAME } from "./consts.js";
import { registerSettings } from "./settings.js";
import { fixEvolutionCost } from "./util.js";
import { handleItemGrants } from "./itemGrants.js";
import { WelcomeWindow } from "./welcome.js";
import { mergeSummons } from "./summons.js";

Hooks.once("init", () => {
    registerSettings();
    game.summoner5e = {
        // easy shortcut to call the func to fixup the evolution cost
        fixEvolutionCost
    };
});

/// This hook is called when the game is ready and will show the welcome dialog if the setting is enabled
Hooks.once("ready", () => {
    if (game.settings.get("summoner-class-for-5e", "showInstructions") === true) {
        game.summoner5e.welcome = new WelcomeWindow();
        game.summoner5e.welcome.render(true);
    }
});

// This hook will update the evolution pool item to show the current value
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

// Catch items that are added to  the actor and handle them - this is used to grant items to the actor
Hooks.on("createItem", async (item) => {  
    const actor = item.actor;
    await handleItemGrants(actor, item);

    if (item.name.startsWith("Summon Monster "))
    {
        const target = actor.items.find(i => i.name === "Summon Monster");
        const source = item;
        await mergeSummons(target, source);
        await actor.deleteEmbeddedDocuments("Item", [ source._id ]);
    }
});

// Catch items that are deleted and remove any items that were granted by the deleted item
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

// For evolution items, show the cost on the item sheet
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