export async function mergeSummons(target, source)
{
    const profiles = [ ...target.system.summons.profiles, ...source.system.summons.profiles ];
    await target.update({ "system.summons.profiles": profiles });
}