const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/movimentacoes - Listar com filtros
router.get('/', (req, res) => {
  try {
    const { produto_id, tipo, data_inicio, data_fim, limit, offset } = req.query;

    let query = `
      SELECT m.*, p.nome as produto_nome, p.sku, p.unidade
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (produto_id) {
      query += ' AND m.produto_id = ?';
      params.push(produto_id);
    }
    if (tipo) {
      query += ' AND m.tipo = ?';
      params.push(tipo);
    }
    if (data_inicio) {
      query += ' AND m.data_hora >= ?';
      params.push(data_inicio + ' 00:00:00');
    }
    if (data_fim) {
      query += ' AND m.data_hora <= ?';
      params.push(data_fim + ' 23:59:59');
    }

    query += ' ORDER BY m.id DESC';

    const lim = parseInt(limit) || 50;
    const off = parseInt(offset) || 0;
    query += ` LIMIT ${lim} OFFSET ${off}`;

    const movimentacoes = db.prepare(query).all(...params);

    // Contar total para paginação
    let countQuery = 'SELECT COUNT(*) as total FROM movimentacoes m WHERE 1=1';
    const countParams = [];
    if (produto_id) { countQuery += ' AND m.produto_id = ?'; countParams.push(produto_id); }
    if (tipo) { countQuery += ' AND m.tipo = ?'; countParams.push(tipo); }
    if (data_inicio) { countQuery += ' AND m.data_hora >= ?'; countParams.push(data_inicio + ' 00:00:00'); }
    if (data_fim) { countQuery += ' AND m.data_hora <= ?'; countParams.push(data_fim + ' 23:59:59'); }

    const total = db.prepare(countQuery).get(...countParams);

    res.json({ movimentacoes, total: total.total });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/movimentacoes - Registrar movimentação
router.post('/', (req, res) => {
  try {
    const { produto_id, tipo, quantidade, endereco_origem, endereco_destino, observacao, usuario } = req.body;

    // Validações básicas
    if (!produto_id) return res.status(400).json({ erro: 'Produto é obrigatório' });
    if (!tipo || !['entrada', 'saida', 'ajuste'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo deve ser: entrada, saida ou ajuste' });
    }
    const qtd = parseFloat(quantidade);
    if (isNaN(qtd) || qtd === 0) return res.status(400).json({ erro: 'Quantidade inválida' });

    // Validações por tipo
    if (tipo === 'entrada' && qtd <= 0) {
      return res.status(400).json({ erro: 'Entrada deve ter quantidade positiva' });
    }
    if (tipo === 'saida' && qtd <= 0) {
      return res.status(400).json({ erro: 'Saída deve ter quantidade positiva' });
    }
    if (tipo === 'entrada' && !endereco_destino) {
      return res.status(400).json({ erro: 'Endereço de destino é obrigatório para entrada' });
    }
    if (tipo === 'saida' && !endereco_origem) {
      return res.status(400).json({ erro: 'Endereço de origem é obrigatório para saída' });
    }

    // Usar transação para garantir consistência
    const registrarMovimentacao = db.transaction(() => {
      // Buscar produto atual (com lock)
      const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(produto_id);
      if (!produto) throw new Error('Produto não encontrado');

      let novoEstoque = produto.estoque_atual;

      if (tipo === 'entrada') {
        novoEstoque += qtd;
      } else if (tipo === 'saida') {
        if (produto.estoque_atual < qtd) {
          throw new Error(`Estoque insuficiente. Disponível: ${produto.estoque_atual} ${produto.unidade}`);
        }
        novoEstoque -= qtd;
      } else if (tipo === 'ajuste') {
        // Ajuste pode ser absoluto (valor final) ou relativo
        // Se quantidade positiva: aumenta; se negativa: diminui
        novoEstoque += qtd;
        if (novoEstoque < 0) {
          throw new Error(`Ajuste resultaria em estoque negativo. Estoque atual: ${produto.estoque_atual}`);
        }
      }

      // Registrar movimentação
      const result = db.prepare(`
        INSERT INTO movimentacoes (produto_id, tipo, quantidade, endereco_origem, endereco_destino, observacao, usuario)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        produto_id,
        tipo,
        qtd,
        endereco_origem || null,
        endereco_destino || null,
        observacao ? observacao.trim() : null,
        usuario || 'sistema'
      );

      // Atualizar estoque do produto
      db.prepare('UPDATE produtos SET estoque_atual = ? WHERE id = ?').run(novoEstoque, produto_id);

      return db.prepare(`
        SELECT m.*, p.nome as produto_nome, p.sku, p.unidade
        FROM movimentacoes m
        JOIN produtos p ON m.produto_id = p.id
        WHERE m.id = ?
      `).get(result.lastInsertRowid);
    });

    const movimentacao = registrarMovimentacao();
    res.status(201).json(movimentacao);
  } catch (err) {
    if (err.message.includes('Estoque insuficiente') || err.message.includes('Produto não encontrado') || err.message.includes('negativo')) {
      return res.status(400).json({ erro: err.message });
    }
    res.status(500).json({ erro: err.message });
  }
});

// Movimentações NÃO podem ser deletadas ou editadas — histórico imutável
router.delete('/:id', (req, res) => {
  res.status(403).json({ erro: 'Movimentações não podem ser excluídas. O histórico é imutável.' });
});

router.put('/:id', (req, res) => {
  res.status(403).json({ erro: 'Movimentações não podem ser editadas. O histórico é imutável.' });
});

module.exports = router;
