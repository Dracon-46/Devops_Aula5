# Painel de Metricas DORA — Aula 5 de DevOps

[![Pipeline CI/CD](https://github.com/Dracon-46/Devops_Aula5/actions/workflows/pipeline.yml/badge.svg)](https://github.com/Dracon-46/Devops_Aula5/actions/workflows/pipeline.yml)

Projeto da **Tarefa 05** da disciplina de DevOps. A proposta da atividade era
escolher **tres Actions do GitHub Marketplace** e desenvolver um projeto que as
utilizasse em uma pipeline automatizada, aplicando cada Action em uma etapa
adequada do processo, executando a pipeline e documentando a funcao de cada uma.

O projeto escolhido e uma aplicacao web que calcula as **quatro metricas DORA**
(DevOps Research and Assessment) a partir dos dados de entrega de um time:
frequencia de deploy, lead time para mudancas, taxa de falha em mudancas e
tempo medio de restauracao (MTTR). O tema foi escolhido de proposito: as
metricas DORA sao a forma mais usada de medir a maturidade de um processo de
DevOps, que e justamente o conteudo da disciplina.

- **Site publicado:** <https://dracon-46.github.io/Devops_Aula5/>
- **Execucoes da pipeline:** [aba Actions](https://github.com/Dracon-46/Devops_Aula5/actions)
- **Repositorio da disciplina:** [Dracon-46/DevOps](https://github.com/Dracon-46/DevOps)

---

## As tres Actions do Marketplace

Cada Action foi aplicada em uma etapa diferente da pipeline, formando a
sequencia **qualidade → teste → entrega**. As etapas sao encadeadas com
`needs:`, ou seja, uma so comeca se a anterior terminar com sucesso.

### 1. `super-linter/super-linter` — etapa de qualidade

- **Marketplace:** <https://github.com/marketplace/actions/super-linter>
- **Referencia usada:** `super-linter/super-linter/slim@v8`
- **Etapa:** `qualidade` (primeira etapa, roda antes de qualquer teste)

**O que faz.** O Super-Linter empacota dezenas de linters em uma unica Action.
Em vez de instalar e configurar cada ferramenta separadamente, a Action sobe um
container que ja tem todas elas e executa apenas as habilitadas por variaveis de
ambiente. Neste projeto foram habilitadas duas:

| Variavel | Linter acionado | O que valida |
| --- | --- | --- |
| `VALIDATE_JAVASCRIPT_ES` | ESLint | Erros e ma pratica no codigo JS (`src/`, `tests/`, `scripts/`) |
| `VALIDATE_JSON` | jsonlint | Sintaxe do `package.json` |

As regras do ESLint ficam versionadas em `.github/linters/eslint.config.mjs`,
que e o caminho que o Super-Linter le por padrao.

**Como contribuiu para a automacao.** Essa etapa transforma a checagem de erros
basicos em algo automatico: nenhum commit com erro de sintaxe, variavel nao
usada, uso de `var` ou comparacao com `==` chega na etapa de testes, porque o
job falha antes. Colocar a analise estatica como **primeira** etapa e
proposital — e a verificacao mais barata e rapida da pipeline, entao falhar cedo
evita gastar tempo de runner instalando dependencias e rodando testes de um
codigo que ja se sabe que esta irregular. E o conceito de "barreira de
qualidade" discutido na Aula 4, aplicado na pratica.

### 2. `dorny/test-reporter` — etapa de testes

- **Marketplace:** <https://github.com/marketplace/actions/test-reporter>
- **Referencia usada:** `dorny/test-reporter@v3`
- **Etapa:** `testes` (depende de `qualidade`)

**O que faz.** O Vitest roda os testes unitarios e grava o resultado em formato
JUnit XML (`test-results/junit.xml`), atraves do script `npm run test:ci`.
Sozinho, esse arquivo e so um XML dentro do runner: para saber o que falhou,
seria preciso abrir o log bruto do job e procurar. O `dorny/test-reporter` le
esse XML e cria um **check run** no GitHub, com uma pagina propria listando cada
teste, o tempo de execucao e, em caso de falha, a mensagem e o stack trace
exatos do teste que quebrou.

A configuracao usa `reporter: jest-junit` (formato compativel com a saida do
Vitest) e `if: always()`, para que o relatorio seja publicado **mesmo quando os
testes falham** — que e justamente quando ele mais importa. O job declara a
permissao `checks: write`, necessaria para criar o check run.

**Como contribuiu para a automacao.** Ele fecha o ciclo de feedback dos testes.
Sem ele, a pipeline apenas diz "passou" ou "falhou"; com ele, o resultado dos 25
testes vira informacao navegavel na propria interface do GitHub, ligada ao
commit e ao pull request. Isso encurta o tempo entre quebrar um teste e
descobrir exatamente qual caso de borda quebrou.

### 3. `peaceiris/actions-gh-pages` — etapa de deploy

- **Marketplace:** <https://github.com/marketplace/actions/github-pages-action>
- **Referencia usada:** `peaceiris/actions-gh-pages@v4`
- **Etapa:** `deploy` (depende de `testes`)

**O que faz.** Depois do build (`npm run build`, que monta a pasta `dist/`), a
Action publica o conteudo dessa pasta no GitHub Pages. Na pratica ela faz um
commit do conteudo de `dist/` na branch `gh-pages`, autenticando com o
`GITHUB_TOKEN` gerado automaticamente para a execucao — por isso o job precisa
da permissao `contents: write`. O passo tem a condicao
`if: github.ref == 'refs/heads/main'`, entao um pull request roda qualidade e
testes, mas **nao** publica: so o que entra na `main` vai para producao.

**Como contribuiu para a automacao.** E a etapa de Continuous Deployment: o
site publicado deixa de depender de alguem lembrar de subir os arquivos e passa
a ser consequencia automatica de um push aprovado nas etapas anteriores. Como o
deploy so roda depois de `qualidade` e `testes`, o encadeamento garante que
nada chega ao ar sem ter passado pela analise estatica e pelos testes unitarios.

---

## Fluxo da pipeline

```text
push / pull_request na main
            │
            ▼
┌───────────────────────────────┐
│ 1. qualidade                  │
│    super-linter/super-linter  │  ESLint + validacao de JSON
└───────────────┬───────────────┘
                │ needs
                ▼
┌───────────────────────────────┐
│ 2. testes                     │
│    npm install → npm run test:ci │  Vitest gera JUnit XML
│    dorny/test-reporter        │  publica o relatorio como check run
└───────────────┬───────────────┘
                │ needs
                ▼
┌───────────────────────────────┐
│ 3. deploy                     │
│    npm run build → dist/      │
│    peaceiris/actions-gh-pages │  publica na branch gh-pages
└───────────────────────────────┘
                │
                ▼
     https://dracon-46.github.io/Devops_Aula5/
```

Actions de apoio usadas nos tres jobs: `actions/checkout` (traz o codigo para o
runner) e `actions/setup-node` (instala o Node 20). Elas nao entram na contagem
das tres escolhidas porque sao infraestrutura basica de qualquer workflow, nao
ferramentas aplicadas a uma etapa especifica do processo.

---

## Estrutura do projeto

```text
Devops_Aula5/
├── .github/
│   ├── linters/
│   │   └── eslint.config.mjs    # regras lidas pelo Super-Linter
│   └── workflows/
│       └── pipeline.yml         # a pipeline com as tres Actions
├── public/
│   ├── index.html               # formulario e area de resultado
│   └── styles.css
├── scripts/
│   └── build.mjs                # gera dist/ (public/ + modulos de src/)
├── src/
│   ├── metrics.js               # logica pura das metricas DORA (testada)
│   └── app.js                   # liga o formulario ao modulo de metricas
├── tests/
│   └── metrics.test.js          # 25 testes unitarios (Vitest)
├── package.json
└── README.md
```

A separacao entre `metrics.js` (calculo puro) e `app.js` (manipulacao de DOM)
foi feita para que a regra de negocio seja testavel sem navegador — condicao
para que os testes rodem dentro do runner do GitHub Actions.

---

## Metricas implementadas

As faixas de classificacao seguem os niveis do relatorio DORA:

| Metrica | Elite | Alto | Medio | Baixo |
| --- | --- | --- | --- | --- |
| Frequencia de deploy | >= 1/dia | >= 1/semana | >= 1/mes | < 1/mes |
| Lead time para mudancas | < 24 h | < 1 semana | < 1 mes | >= 1 mes |
| Taxa de falha em mudancas | <= 5% | <= 10% | <= 15% | > 15% |
| Tempo de restauracao (MTTR) | < 1 h | < 24 h | < 1 semana | >= 1 semana |

---

## Rodando localmente

```bash
npm install      # instala as dependencias
npm test         # roda os 25 testes unitarios
npm run test:ci  # roda os testes e gera test-results/junit.xml
npm run build    # gera a pasta dist/ pronta para publicacao
```

Para abrir a pagina localmente, sirva a pasta `dist/` com qualquer servidor
estatico (os modulos ES exigem HTTP, nao funcionam via `file://`):

```bash
npm run build && npx --yes serve dist
```

---

## Autor

Arthur Gaspare Camzano — [@Dracon-46](https://github.com/Dracon-46)
Disciplina de DevOps — Tarefa 05.
