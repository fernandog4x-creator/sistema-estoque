const Database = require('better-sqlite3');
const path = require('path');

// Inicializar banco de dados SQLite
const db = new Database(path.join(__dirname, 'estoque.db'));

// Habilitar WAL mode para melhor performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Criar tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    categoria TEXT,
    unidade TEXT NOT NULL DEFAULT 'un',
    estoque_minimo REAL NOT NULL DEFAULT 0,
    endereco_principal TEXT,
    estoque_atual REAL NOT NULL DEFAULT 0,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS enderecos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'ativo',
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS movimentacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    tipo TEXT NOT NULL,
    quantidade REAL NOT NULL,
    endereco_origem TEXT,
    endereco_destino TEXT,
    observacao TEXT,
    data_hora TEXT DEFAULT (datetime('now','localtime')),
    usuario TEXT DEFAULT 'sistema'
  );

  CREATE TABLE IF NOT EXISTS inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    endereco TEXT,
    estoque_sistema REAL NOT NULL DEFAULT 0,
    estoque_contado REAL,
    data_contagem TEXT DEFAULT (datetime('now','localtime')),
    ajustado INTEGER DEFAULT 0
  );
`);

// Verificar se já existem dados de exemplo
const totalEnderecos = db.prepare('SELECT COUNT(*) as total FROM enderecos').get();

if (totalEnderecos.total === 0) {
  // Inserir endereços de exemplo
  const insertEndereco = db.prepare(`
    INSERT INTO enderecos (codigo, descricao, status) VALUES (?, ?, 'ativo')
  `);

  insertEndereco.run('A-01-01-01', 'Área A - Corredor 01 - Prateleira 01 - Nível 01');
  insertEndereco.run('A-01-01-02', 'Área A - Corredor 01 - Prateleira 01 - Nível 02');
  insertEndereco.run('A-01-02-01', 'Área A - Corredor 01 - Prateleira 02 - Nível 01');
  insertEndereco.run('B-01-01-01', 'Área B - Corredor 01 - Prateleira 01 - Nível 01');
  insertEndereco.run('B-02-01-01', 'Área B - Corredor 02 - Prateleira 01 - Nível 01');

  // Inserir produtos de exemplo
  const insertProduto = db.prepare(`
    INSERT INTO produtos (sku, nome, categoria, unidade, estoque_minimo, endereco_principal, estoque_atual)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `);

  insertProduto.run('CANETA-001', 'Caneta Esferográfica Azul', 'Papelaria', 'un', 50, 'A-01-01-01');
  insertProduto.run('PAPEL-A4-001', 'Papel A4 500 Folhas', 'Papelaria', 'resma', 20, 'A-01-01-02');
  insertProduto.run('CAIXA-G-001', 'Caixa Papelão Grande', 'Embalagens', 'un', 30, 'A-01-02-01');
  insertProduto.run('FITA-001', 'Fita Adesiva 45mm', 'Embalagens', 'rolo', 15, 'B-01-01-01');

  // Inserir movimentações de entrada iniciais
  const insertMov = db.prepare(`
    INSERT INTO movimentacoes (produto_id, tipo, quantidade, endereco_destino, observacao, usuario)
    VALUES (?, 'entrada', ?, ?, 'Estoque inicial', 'sistema')
  `);

  const produtos = db.prepare('SELECT id, sku FROM produtos').all();
  const estoques = { 'CANETA-001': 120, 'PAPEL-A4-001': 45, 'CAIXA-G-001': 60, 'FITA-001': 30 };
  const enderecosProd = { 'CANETA-001': 'A-01-01-01', 'PAPEL-A4-001': 'A-01-01-02', 'CAIXA-G-001': 'A-01-02-01', 'FITA-001': 'B-01-01-01' };

  const updateEstoque = db.prepare('UPDATE produtos SET estoque_atual = ? WHERE id = ?');

  for (const p of produtos) {
    const qtd = estoques[p.sku] || 0;
    const end = enderecosProd[p.sku] || '';
    insertMov.run(p.id, qtd, end);
    updateEstoque.run(qtd, p.id);
  }
}

module.exports = db;
