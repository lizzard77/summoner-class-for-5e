import { MODULE_NAME } from "./consts.js";
import { registerSettings } from "./settings.js";
import { WelcomeWindow } from "./welcome.js";

Hooks.once("init", () => {
    game.summoner5e = {
        "test" : "doofus"
    };
    registerSettings();
});


Hooks.once("ready", () => {
    // Do anything you need to do when the module is ready
    // get setting "summoner-class-for-5e", "showInstructions"
    // if true, show instructions
    // if false, do nothing
    if (game.settings.get("summoner-class-for-5e", "showInstructions") === true) {
        game.summoner5e.welcome = new WelcomeWindow();
        game.summoner5e.welcome.render(true);
    }

    // get game pack summoner-class-for-5e.summoner-class-items
    const items = game.packs.get(`${MODULE_NAME}.summoner-class-items`);
    const instructions = game.packs.get(`${MODULE_NAME}.summoner-class-instructions`);
    const actors = game.packs.get(`${MODULE_NAME}.summoner-class-actors`);
});

Hooks.on("renderActorSheet", (app, html, actor) => {
    
    const evolutions = actor.items.filter(item => item.name.indexOf("(Evolution)"));
    
    actor.items.forEach(item => {
        if (item.name.startsWith("Evolution Pool")) {
            const currentValue = actor.system.scale.item["evolution-pool"];
            item.update({name: `Evolution Pool (Available: ${currentValue})`});
        }
    });

});

Hooks.on("createItem", async (item) => {  
    if (!item.name.indexOf("(Evolution)") < 0) return;
    if (!item.name.indexOf("Base Form") < 0) return;
    
    const actor = item.actor;
    const description = item.system.description?.value;
    const itemsInDescriptionRegex = "@UUID\\[(\\S+)\\]\\{([^\\}]+)\\}";
    const matches = description.matchAll(new RegExp(itemsInDescriptionRegex, "g"));

    if (!actor || !matches) 
        return;    

    
    let buttons = "";
    let items = [];
    for (const match of matches)
    {
        const fullId = match[1];
        //const name = match[2]; // not used atm
        const id = fullId.split(".").pop();
        const [ _, module, compendium, rest ] = fullId.split(".");
        const pack = game.packs.get(`${module}.${compendium}`);
        const item = await pack?.getDocument(id);
        if (item) 
        {
            buttons += `<input name="spell" id="spellSel" type="radio" value="${item._id}" />${item.name}<br />`;
            items.push(item);
        } else {
            console.log(`Could not find item with id ${id}`);
        }
    }

    if (items.length === 0) return;

    const isBaseForm = item.name.indexOf("Base Form") >= 0;

    if (items.length === 1 || isBaseForm) {
        await actor.createEmbeddedDocuments('Item', items);
        let names = items.map(i => i.name).join(", ");
        names = names.replace(/, $/, "");
        ui.notifications.info(`You have gained: ${names}.`);
        
        /*if (isBaseForm) {
            actor.items.forEach(item => {
                item.transferredEffects.forEach(effect => {
                    let newChanges = effect.changes.filter(change => change.key !== "system.scale.item.evolution-pool");
                    let ch = effect.changes.find(change => change.key === "system.scale.item.evolution-pool");
                    if (ch) 
                        effect.deleteEmbeddedDocuments("ActiveEffectChange", ch);

                    //effect.updateEmbeddedDocuments({ changes: [newChanges] });
                });
            });
        }*/
    } else {
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
                        await actor.createEmbeddedDocuments('Item', [item]);
                        ui.notifications.info(`You have gained ${item.name} from your evolution.`);
                    }
                }
            }
        }).render(true);            
    }
});


