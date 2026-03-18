# 📦 EstoqueControl

Sistema web completo de controle de estoque com rastreabilidade total de movimentações.

## 🚀 Como executar

### Pré-requisitos
- Node.js 18+ instalado ([nodejs.org](https://nodejs.org))

### Instalação e execução
```bash
git clone https://github.com/fernandog4x-creator/sistema-estoque.git
cd sistema-estoque
npm install
npm start
```

Acesse no navegador: **http://localhost:3000**

> O banco de dados SQLite (`estoque.db`) é criado automaticamente com dados de exemplo na primeira execução.

---

## 📋 Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| 🏠 **Dashboard** | Visão geral com cards de KPIs, alertas e últimas movimentações |
| 🏷️ **Produtos** | Cadastro completo com SKU, categoria, unidade, estoque mínimo e endereço |
| 📍 **Endereços** | Endereçamento físico no formato `A-01-02-03` (Área-Corredor-Prateleira-Nível) |
| 🔄 **Movimentação** | Registro de Entrada, Saída e Ajuste com validações rigorosas |
| 📜 **Histórico** | Histórico imutável com filtros por produto, tipo e período |
| 🔍 **Inventário** | Contagem física com ajuste automático e geração de movimentações |
| 📊 **Consulta** | Posição de estoque em tempo real com alertas de mínimo |

## 🔒 Regras de negócio

- ✅ Todo estoque é controlado **exclusivamente por movimentações**
- ✅ **Entrada** soma no estoque + requer endereço de destino
- ✅ **Saída** reduz o estoque + requer endereço de origem + não permite saldo negativo
- ✅ **Ajuste** corrige divergências + pode ser positivo ou negativo
- ✅ Histórico de movimentações é **imutável** (sem delete/update)
- ✅ Produtos com movimentações **não podem ser excluídos**

## 🏗️ Tecnologias

- **Backend:** Node.js + Express
- **Banco de dados:** SQLite via `better-sqlite3`
- **Frontend:** HTML5 + CSS3 + JavaScript puro (sem frameworks)
- **Zero dependências externas** no frontend (sem React, Vue, Bootstrap, etc.)

## 📁 Estrutura do projeto

```
sistema-estoque/
├── server.js              # Servidor Express (porta 3000)
├── database.js            # Inicialização do banco SQLite + dados de exemplo
├── package.json
├── routes/
│   ├── produtos.js        # CRUD de produtos
│   ├── enderecos.js       # CRUD de endereços
│   ├── movimentacoes.js   # Registro de movimentações (imutável)
│   └── inventario.js      # Contagem e ajuste de inventário
└── public/
    ├── index.html         # SPA com menu lateral
    ├── style.css          # Design system customizado
    └── app.js             # Lógica completa do frontend
```

## 📊 Estrutura do banco de dados

| Tabela | Descrição |
|--------|-----------|
| `produtos` | Cadastro de produtos com SKU único |
| `enderecos` | Endereços no formato A-01-02-03 |
| `movimentacoes` | Histórico imutável de todas as movimentações |
| `inventario` | Contagens físicas e ajustes |

---

Desenvolvido com ❤️ — Sistema funcional e pronto para produção.
