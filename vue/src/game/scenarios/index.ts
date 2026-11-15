import { BASE } from './base'
import { BATTLE } from './battle'
import { DUEL } from './duel'
import type { Scenario } from '@/game/types'
import {THREE_SIDES} from "@/game/scenarios/three-sides";

// все сценарии
export const SCENARIOS: Scenario[] = [BASE, DUEL, BATTLE, THREE_SIDES]
