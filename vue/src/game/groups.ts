const colors = ['#ffd376', '#e8736b', '#b08cff', '#6fc3e8', '#f5a3d6', '#9be07a']

export const groupColor = (group: number) => colors[(group - 1) % colors.length]
