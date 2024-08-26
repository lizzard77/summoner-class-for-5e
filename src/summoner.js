import { MODULE_NAME } from "./consts.js";
import { registerSettings } from "./settings.js";
import { fixEvolutionCost } from "./util.js";
import { handleItemGrants, handleRemoveGrants } from "./itemGrants.js";
import { WelcomeWindow } from "./welcome.js";
import { mergeSummons } from "./summons.js";
import { evolutionHandlers } from "./evolutions.js";

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
    // Gather the cost of all the items and update the evolution pool item
    const cost = actor.items.reduce((acc, item) => {
        const cost = parseInt(item.getFlag(MODULE_NAME, "cost")) || 0;
        const extra = parseInt(item.getFlag(MODULE_NAME, "extra")) || 0;
        console.log(`Cost: ${item.name} ${cost}, extra EP: ${extra}`);
        return acc + cost + extra;
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

    const handler = evolutionHandlers[item.name];
    if (handler) await handler.configure(actor, item);
});

// Catch items that are deleted and remove any items that were granted by the deleted item
Hooks.on("deleteItem", async(item) => 
{
    const actor = item.actor;
    if (!actor) return;
    await handleRemoveGrants(actor, item);
    const handler = evolutionHandlers[item.name];
    if (handler) await handler.unConfigure(actor, item);
});

// For evolution items, show the cost on the item sheet
Hooks.on("renderItemSheet", (app, html, args) => {
    const item = args.document;
    console.log(`Rendering item sheet for ${item.name}`);
    const cost = item.getFlag(MODULE_NAME, "cost");
    const extra = item.getFlag(MODULE_NAME, "extra");
    const isFromBaseform = item.getFlag(MODULE_NAME, "fromBaseform") === true;
    if (Number.isInteger(cost))
    {
        const inputforCost = `<div class="property" id="epcost" style="margin-top: 0.5em;">EP Cost: ${cost}</div>`;
        const baseFormInfo = `<div class="property" style="margin-top: 0.5em;"><span>Evolution from Base Form</span></div>`;
        const inputforExtra = `<div class="property" id="epextra" style="margin-top: 0.5em;"><span>Extra EP:</span><br /><input type="number" size="2" value=${extra} style="text-align: center; border: 1px solid black;" /></div>`;

        html.find(".item-properties").append(isFromBaseform ? baseFormInfo : inputforCost);
        html.find(".item-properties").append(inputforExtra);

        html.find("#epcost input").change(async (ev) => {
            const cost = parseInt(ev.target.value);
            await item.setFlag(MODULE_NAME, "cost", cost);
        });
        html.find("#epextra input").change(async (ev) => {
            const extra = parseInt(ev.target.value);
            await item.setFlag(MODULE_NAME, "extra", extra);
        });
    }
});

Hooks.on("updateItem", async (item, changes) => {
    const cost = item.getFlag(MODULE_NAME, "cost");
    const extra = item.getFlag(MODULE_NAME, "extra");
    if ((Number.isInteger(cost) || Number.isInteger(extra)) && item.actor)
    {
        const actor = item.actor;
        const handler = evolutionHandlers[item.name];
        if (handler) await handler.update(actor, item);
    }
});