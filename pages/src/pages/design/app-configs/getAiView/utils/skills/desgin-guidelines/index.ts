export const DESGIN_GUIDELINES = 'desgin-guidelines'

export default {
    name: DESGIN_GUIDELINES,
    files: [
        {
            path: 'SKILL.md',
            content: require('./SKILL.md').default,
        },
    ],
}