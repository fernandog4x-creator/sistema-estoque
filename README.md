# 📦 EstoqueControl

Sistema web completo de controle de estoque com rastreabilidade total.

## 🚀 Como executar

### Pré-requisitos
- Node.js 18+ instalado

### Instalação
```bash
git clone https://github.com/fernandog4x-creator/sistema-estoque.git
cd sistema-estoque
npm install
npm start
```

Acesse: **http://localhost:3000**

## 📋 Funcionalidades

- ✅ Cadastro de produtos com SKU e endereçamento
- ✅ Endereçamento físico no formato A-01-02-03
- ✅ Movimentações de entrada, saída e ajuste
- ✅ Histórico completo e imutável
- ✅ Inventário com ajuste automático
- ✅ Consulta com alertas de estoque mínimo
- ✅ Dashboard com indicadores em tempo real

## 🏗️ Tecnologias

- **Backend:** Node.js + Express
- **Banco de dados:** SQLite (better-sqlite3)
- **Frontend:** HTML5 + CSS3 + JavaScript puro (sem frameworks)

## 📁 Estrutura

```
sistema-estoque/
├── server.js           # Servidor Express (porta 3000)
├── database.js         # Inicialização do banco SQLite
├── package.json        # Dependências
├── routes/
│   ├── produtos.js     # CRUD de produtos
│   ├── enderecos.js    # CRUD de endereços
│   ├── movimentacoes.js# Registro de movimentações
│   └── inventario.js   # Controle de inventário
└── public/
    ├── index.html      # SPA principal
    ├── style.css       # Estilos modernos
    └── app.js          # Lógica do frontend
```

## 🗄️ Banco de Dados

### Tabelas
- **produtos** — Cadastro de produtos com SKU, categoria, unidade e estoque mínimo
- **enderecos** — Localizações físicas no formato A-01-02-03
- **movimentacoes** — Histórico imutável de todas as movimentações
- **inventario** — Controle de contagens físicas

## 📐 Regras de Negócio

- Todo estoque é controlado por movimentação (entrada/saída/ajuste)
- Não é permitida edição direta do estoque
- O histórico de movimentações não pode ser apagado
- Saída não permite estoque negativo
- Inventário gera movimentação de ajuste automática

## 🖥️ Páginas do Sistema

| Página | Descrição |
|--------|-----------|
| 🏠 Dashboard | Indicadores, alertas e últimas movimentações |
| 🏷️ Produtos | Cadastro e gestão de produtos |
| 📍 Endereços | Mapeamento físico do estoque |
| 🔄 Movimentação | Registro de entrada, saída e ajuste |
| 📜 Histórico | Consulta de movimentações com filtros |
| 🔍 Inventário | Contagem física e ajuste automático |
| 📊 Consulta | Posição atual do estoque com alertas |
