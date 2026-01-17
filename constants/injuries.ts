import { TableEntry, InjuryResultData } from '../types';

export const INJURY_TABLE: TableEntry<InjuryResultData>[] = [
    { roll_range: [1, 5], value: { id: 'gruesome_fate', descriptionKey: 'postBattle.injuries.dead', isDead: true, equipmentEffect: 'damaged' } },
    { roll_range: [6, 15], value: { id: 'dead', descriptionKey: 'postBattle.injuries.dead', isDead: true } },
    { roll_range: [16, 16], value: { id: 'miraculous_escape', descriptionKey: 'postBattle.injuries.miraculous_escape', equipmentEffect: 'lost' } },
    { roll_range: [17, 30], value: { id: 'equipment_loss', descriptionKey: 'postBattle.injuries.equipment_loss', equipmentEffect: 'damaged' } },
    { roll_range: [31, 45], value: { id: 'crippling_wound', descriptionKey: 'postBattle.injuries.crippling_wound', surgeryCost: '1d6', recoveryTurns: '1d6' } },
    { roll_range: [46, 54], value: { id: 'serious_injury', descriptionKey: 'postBattle.injuries.light_wound', recoveryTurns: '1d3+1' } },
    { roll_range: [55, 80], value: { id: 'minor_injuries', descriptionKey: 'postBattle.injuries.light_wound', recoveryTurns: 1 } },
    { roll_range: [81, 95], value: { id: 'knocked_out', descriptionKey: 'postBattle.injuries.knocked_out' } },
    { roll_range: [96, 100], value: { id: 'school_of_hard_knocks', descriptionKey: 'postBattle.injuries.school_of_hard_knocks', xpGain: 1 } },
];


export const BOT_INJURY_TABLE: TableEntry<InjuryResultData>[] = [
    { roll_range: [1, 5], value: { id: 'obliterated', descriptionKey: 'postBattle.injuries.dead', isDead: true, equipmentEffect: 'damaged' } },
    { roll_range: [6, 15], value: { id: 'destroyed', descriptionKey: 'postBattle.injuries.dead', isDead: true } },
    { roll_range: [16, 30], value: { id: 'equipment_loss', descriptionKey: 'postBattle.injuries.equipment_loss', equipmentEffect: 'damaged' } },
    { roll_range: [31, 45], value: { id: 'severe_damage', descriptionKey: 'postBattle.injuries.light_wound', recoveryTurns: '1d6' } },
    { roll_range: [46, 65], value: { id: 'minor_damage', descriptionKey: 'postBattle.injuries.light_wound', recoveryTurns: 1 } },
    { roll_range: [66, 100], value: { id: 'dents', descriptionKey: 'postBattle.injuries.knocked_out' } },
];