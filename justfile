[working-directory: 'packages/ui']
add-ui +component:
    pnpm dlx shadcn@latest add {{ component }} --yes

[working-directory: 'examples/react']
dev args='':
    bun dev {{ args }}
