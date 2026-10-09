const GROUP_MARK = {from: {u: 0.06, v: 0.06}, to: {u: 0.2, v: 0.2}, color: 'group'}

export const BUILDING_SPRITES = {
    core: {
        rects: [
            {from: {u: 0.2, v: 0.2}, to: {u: 0.8, v: 0.8}, color: 'light'},
            {from: {u: 0.35, v: 0.35}, to: {u: 0.65, v: 0.65}, color: 'dark'},
            {from: {u: 0.8, v: 0.06}, to: {u: 0.94, v: 0.2}, color: 'dark'},
            {from: {u: 0.8, v: 0.8}, to: {u: 0.94, v: 0.94}, color: 'dark'},
            {from: {u: 0.06, v: 0.8}, to: {u: 0.2, v: 0.94}, color: 'dark'},
            GROUP_MARK,
        ],
        circles: [],
        vents: [{u: 0.5, v: 0.5}],
    },
    factory: {
        rects: [
            {from: {u: 0.25, v: 0.15}, to: {u: 0.85, v: 0.28}, color: 'light'},
            {from: {u: 0.25, v: 0.72}, to: {u: 0.85, v: 0.85}, color: 'light'},
            GROUP_MARK,
        ],
        circles: [
            {center: {u: 0.38, v: 0.5}, radius: 0.1, color: 'dark'},
            {center: {u: 0.68, v: 0.5}, radius: 0.1, color: 'dark'},
        ],
        vents: [{u: 0.38, v: 0.5}, {u: 0.68, v: 0.5}],
    },
    airfield: {
        rects: [
            {from: {u: 0.15, v: 0.15}, to: {u: 0.85, v: 0.85}, color: 'dark'},
            {from: {u: 0.46, v: 0.22}, to: {u: 0.54, v: 0.78}, color: 'light'},
            {from: {u: 0.22, v: 0.46}, to: {u: 0.78, v: 0.54}, color: 'light'},
            GROUP_MARK,
        ],
        circles: [],
        vents: [],
    },
    shipyard: {
        rects: [
            {from: {u: 0.1, v: 0.42}, to: {u: 0.9, v: 0.58}, color: 'dark'},
            {from: {u: 0.7, v: 0.3}, to: {u: 0.9, v: 0.7}, color: 'light'},
            GROUP_MARK,
        ],
        circles: [],
        vents: [],
    },
    habitat: {
        rects: [GROUP_MARK],
        circles: [
            {center: {u: 0.5, v: 0.5}, radius: 0.32, color: 'light'},
            {center: {u: 0.5, v: 0.5}, radius: 0.18, color: 'body'},
        ],
        vents: [],
    },
    turret: {
        rects: [
            {from: {u: 0.1, v: 0.1}, to: {u: 0.9, v: 0.9}, color: 'dark'},
        ],
        circles: [],
        vents: [],
    },
    wall: {
        rects: [
            {from: {u: 0.2, v: 0.2}, to: {u: 0.8, v: 0.8}, color: 'dark'},
            {from: {u: 0.38, v: 0.38}, to: {u: 0.62, v: 0.62}, color: 'group'},
        ],
        circles: [],
        vents: [],
    },
}
