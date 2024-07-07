import { MODULE_NAME } from "./consts.js";

export class WelcomeWindow extends Application
{
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "summoner5e",
            title : "Summoner", 
            template: `modules/${MODULE_NAME}/templates/welcome.hbs`
        });
    }

    getData() {
        return {};
    }

    activateListeners(html) {
        html.find("button.setup").click(async (event) => { 
            const doc = await fromUuid("Compendium.summoner-class-for-5e.summoner-class-instructions.JournalEntry.WlIcY19xzbs2XT9Q");
            doc?.sheet?.render(true);
        });

        html.find("button.usage").click(async (event) => { 
            const doc = await fromUuid("Compendium.summoner-class-for-5e.summoner-class-instructions.JournalEntry.4HsV44yjmZAtFoSr");
            doc?.sheet?.render(true);
        });

        html.find("input#showWelcome").click(async (event) => { 
            game.settings.set(MODULE_NAME, "showInstructions", !event.target.checked);
        });
    }
}

