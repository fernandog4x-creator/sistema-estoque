const express = require('express');
const cors = require('cors');
const path = require('path');

// Inicializar banco de dados
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api/produtos', require('./routes/produtos'));
app.use('/api/enderecos', require('./routes/enderecos'));
app.use('/api/movimentacoes', require('./routes/movimentacoes'));
app.use('/api/inventario', require('./routes/inventario'));

// Rota para estatísticas do dashboard
app.get('/api/dashboard', (req, res) => {
  try {
    const totalProdutos = db.prepare('SELECT COUNT(*) as total FROM produtos').get();
    const produtosAlerta = db.prepare('SELECT COUNT(*) as total FROM produtos WHERE estoque_atual <= estoque_minimo').get();
    const enderecosAtivos = db.prepare("SELECT COUNT(*) as total FROM enderecos WHERE status = 'ativo'").get();

    const hoje = new Date().toISOString().slice(0, 10);
    const movsHoje = db.prepare("SELECT COUNT(*) as total FROM movimentacoes WHERE data_hora LIKE ?").get(`${hoje}%`);

    const ultimosMovs = db.prepare(`
      SELECT m.*, p.nome as produto_nome, p.sku
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      ORDER BY m.id DESC
      LIMIT 5
    `).all();

    const alertas = db.prepare(`
      SELECT id, sku, nome, estoque_atual, estoque_minimo, endereco_principal
      FROM produtos
      WHERE estoque_atual <= estoque_minimo
      ORDER BY (estoque_atual - estoque_minimo) ASC
    `).all();

    res.json({
      totalProdutos: totalProdutos.total,
      produtosAlerta: produtosAlerta.total,
      enderecosAtivos: enderecosAtivos.total,
      movsHoje: movsHoje.total,
      ultimosMovs,
      alertas
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Catch-all: retornar index.html para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   📦  EstoqueControl  v1.0.0         ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  🚀  http://localhost:${PORT}           ║`);
  console.log('║  💾  Banco: estoque.db               ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
});
