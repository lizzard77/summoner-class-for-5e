import { MODULE_NAME } from "./consts.js";

export function registerSettings() 
{
    game.settings.register(MODULE_NAME, "spellCompendium", {
        name: "Compendium Name",
        hint: "ID of the compendium containing the spells",
        scope: "world",
        config: true,
        type: String,
        default: `${MODULE_NAME}.summoner-class-items`
    });

    game.settings.register(MODULE_NAME, "spellFolder", {
        name: "Spells folder",
        hint: "Name of the base folder. Must contain folders named \"Level 0\", \"Level 1\", etc.",
        scope: "world",
        config: true,
        type: String,
        default: "Summoner Spells"
    });

    game.settings.register(MODULE_NAME, "showInstructions", {
        name: "Show instructions on startup",
        hint: "",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
};