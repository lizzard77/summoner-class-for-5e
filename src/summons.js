export async function mergeSummons(target, source)
{
    // current list: summon 1 of each
    source.system.summons.profiles.forEach(profile => { profile.count = "1"; });
    // previous list: summon 1d3 of each, all lists before that: summon 1d4+1 of each
    target.system.summons.profiles.forEach(profile => { 
        if (profile.count === "1") profile.count = "1d3";
        else if (profile.count === "1d3") profile.count = "1d4+1";
    });
    
    const profiles = [ ...target.system.summons.profiles, ...source.system.summons.profiles ];
    await target.update({ "system.summons.profiles": profiles });
}