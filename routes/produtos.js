const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/produtos - Listar todos os produtos
router.get('/', (req, res) => {
  try {
    const produtos = db.prepare(`
      SELECT p.*,
        CASE WHEN p.estoque_atual <= p.estoque_minimo THEN 1 ELSE 0 END as em_alerta
      FROM produtos p
      ORDER BY p.nome ASC
    `).all();
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/produtos/:id - Buscar produto por ID
router.get('/:id', (req, res) => {
  try {
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(produto);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/produtos - Criar produto
router.post('/', (req, res) => {
  try {
    const { sku, nome, categoria, unidade, estoque_minimo, endereco_principal } = req.body;

    // Validações
    if (!sku || !sku.trim()) return res.status(400).json({ erro: 'SKU é obrigatório' });
    if (!nome || !nome.trim()) return res.status(400).json({ erro: 'Nome é obrigatório' });
    if (!unidade || !unidade.trim()) return res.status(400).json({ erro: 'Unidade é obrigatória' });

    // Verificar SKU duplicado
    const existente = db.prepare('SELECT id FROM produtos WHERE sku = ?').get(sku.trim().toUpperCase());
    if (existente) return res.status(400).json({ erro: 'SKU já cadastrado' });

    const stmt = db.prepare(`
      INSERT INTO produtos (sku, nome, categoria, unidade, estoque_minimo, endereco_principal, estoque_atual)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);

    const result = stmt.run(
      sku.trim().toUpperCase(),
      nome.trim(),
      categoria ? categoria.trim() : null,
      unidade.trim(),
      parseFloat(estoque_minimo) || 0,
      endereco_principal ? endereco_principal.trim() : null
    );

    const novoProduto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(novoProduto);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ erro: 'SKU já cadastrado' });
    }
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/produtos/:id - Atualizar produto (NÃO atualizar estoque_atual diretamente)
router.put('/:id', (req, res) => {
  try {
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });

    const { sku, nome, categoria, unidade, estoque_minimo, endereco_principal } = req.body;

    if (!sku || !sku.trim()) return res.status(400).json({ erro: 'SKU é obrigatório' });
    if (!nome || !nome.trim()) return res.status(400).json({ erro: 'Nome é obrigatório' });

    // Verificar SKU duplicado em outro produto
    const existente = db.prepare('SELECT id FROM produtos WHERE sku = ? AND id != ?').get(sku.trim().toUpperCase(), req.params.id);
    if (existente) return res.status(400).json({ erro: 'SKU já cadastrado em outro produto' });

    db.prepare(`
      UPDATE produtos
      SET sku = ?, nome = ?, categoria = ?, unidade = ?, estoque_minimo = ?, endereco_principal = ?
      WHERE id = ?
    `).run(
      sku.trim().toUpperCase(),
      nome.trim(),
      categoria ? categoria.trim() : null,
      unidade ? unidade.trim() : produto.unidade,
      parseFloat(estoque_minimo) || 0,
      endereco_principal ? endereco_principal.trim() : null,
      req.params.id
    );

    const atualizado = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/produtos/:id - Deletar produto
router.delete('/:id', (req, res) => {
  try {
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });

    // Verificar se tem movimentações
    const movs = db.prepare('SELECT COUNT(*) as total FROM movimentacoes WHERE produto_id = ?').get(req.params.id);
    if (movs.total > 0) {
      return res.status(400).json({ erro: `Produto possui ${movs.total} movimentação(ões) e não pode ser excluído` });
    }

    db.prepare('DELETE FROM inventario WHERE produto_id = ?').run(req.params.id);
    db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);

    res.json({ mensagem: 'Produto excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
