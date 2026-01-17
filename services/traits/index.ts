import { TraitPlugin } from '../../types';
import { afterActionTraits } from './afterAction';
import { brawlingTraits } from './brawling';
import { damageTraits } from './damage';
import { hitTraits } from './hit';
import { savingThrowTraits } from './savingThrow';
import { shootingTraits } from './shooting';
import { implantTraits } from './implantTraits';
import { utilityDeviceTraits } from './utilityDeviceTraits';

export const ALL_TRAITS: TraitPlugin[] = [
    ...afterActionTraits,
    ...brawlingTraits,
    ...damageTraits,
    ...hitTraits,
    ...savingThrowTraits,
    ...shootingTraits,
    ...implantTraits,
    ...utilityDeviceTraits,
];