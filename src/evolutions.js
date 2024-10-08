import { MODULE_NAME } from "./consts.js";

const flight = {
    configure : async (actor) => {
        const walkingSpeed = actor.system.attributes.movement.walk;
        const flyingSpeed = walkingSpeed;
        await actor.update({ "system.attributes.movement.fly" : flyingSpeed});
        ui.notifications.info(`Your flying speed is now ${flyingSpeed} ft.`);
    },
    unConfigure : async (actor) => {
        await actor.update({ "system.attributes.movement.fly" : 0});
    },
    update : async (actor, item) => {
        const extra = item.getFlag(MODULE_NAME, "extra") || 0;
        const walkingSpeed = actor.system.attributes.movement.walk;
        const flyingSpeed = walkingSpeed + (parseInt(extra) * 20);
        await actor.update({ "system.attributes.movement.fly" : flyingSpeed});
        ui.notifications.info(`Your flying speed is now ${flyingSpeed} ft.`);
    }
}

const magic = {
    configure : async (actor, item) => {
        const spell = actor.items.filter(i => i.getFlag(MODULE_NAME, "source") === item._id);
        await spell.update({ "system.uses" : { "per" : "day", "max" : 1, "value" : 1 }});
    },
    unConfigure : async () => {
        
    },
    update : async (actor, item) => {
        const extra = item.getFlag(MODULE_NAME, "extra") || 0;
        const spell = actor.items.find(i => i.getFlag(MODULE_NAME, "source") === item._id);
        if (!spell) return;
        const max = extra >= 2 ? 3 : 1;
        await spell.update({ "system.uses" : { "per" : "day", "max" : max, "value" : 1 }});
        ui.notifications.info(`${spell.name} now can be used up to ${max} times per day after your next long rest.`);
    }
}

export const evolutionHandlers = {
    "Flight (Evolution)" : flight,
    "Basic Magic (Evolution)" : magic,
    "Minor Magic (Evolution)" : magic,
    "Major Magic (Evolution)" : magic,
    "Ultimate Magic (Evolution)" : magic
}