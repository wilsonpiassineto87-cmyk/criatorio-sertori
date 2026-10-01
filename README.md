# Criatório Sertori

Sistema de cadastro das aves do criatório: calopsitas, ring necks, agapórnis e roséolas, com as cores (mutações) de cada uma, vacinas, nascimentos e backup.

## Como rodar

```bash
npm install
npm start
```

Depois acesse http://localhost:3000

## Funções

- **Aves**: cadastro com nome, espécie, cor/mutação, sexo, anilha, registro e idade. Filtro por espécie e sexo e resumo do plantel.
- **Vacinas**: registro de vacinas e medicamentos por ave, com data da próxima dose.
- **Nascimentos**: registro de filhotes por casal (mãe e pai).
- **Backup**: backup automático diário em `backups/`, backup manual, exportação e importação em JSON.

As cores sugeridas para cada espécie ficam no início de `public/app.js` (objeto `ESPECIES`). Para adicionar uma espécie ou mutação nova, basta editar essa lista. O campo de cor também aceita cores digitadas à mão.
