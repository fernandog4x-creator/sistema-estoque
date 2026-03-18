const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/inventario - Listar itens de inventário aberto
router.get('/', (req, res) => {
  try {
    const itens = db.prepare(`
      SELECT i.*, p.nome as produto_nome, p.sku, p.unidade,
        (i.estoque_contado - i.estoque_sistema) as diferenca
      FROM inventario i
      JOIN produtos p ON i.produto_id = p.id
      ORDER BY p.nome ASC
    `).all();
    res.json(itens);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/inventario/novo - Iniciar nova contagem com todos os produtos
router.post('/novo', (req, res) => {
  try {
    const iniciarContagem = db.transaction(() => {
      // Limpar inventário anterior não ajustado
      db.prepare('DELETE FROM inventario WHERE ajustado = 0').run();

      // Buscar todos os produtos
      const produtos = db.prepare('SELECT * FROM produtos ORDER BY nome').all();

      const insertItem = db.prepare(`
        INSERT INTO inventario (produto_id, endereco, estoque_sistema, estoque_contado, ajustado)
        VALUES (?, ?, ?, NULL, 0)
      `);

      for (const p of produtos) {
        insertItem.run(p.id, p.endereco_principal || '', p.estoque_atual);
      }

      return db.prepare(`
        SELECT i.*, p.nome as produto_nome, p.sku, p.unidade
        FROM inventario i
        JOIN produtos p ON i.produto_id = p.id
        WHERE i.ajustado = 0
        ORDER BY p.nome
      `).all();
    });

    const itens = iniciarContagem();
    res.status(201).json({ mensagem: `Nova contagem iniciada com ${itens.length} produto(s)`, itens });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/inventario - Criar/atualizar item de contagem
router.post('/', (req, res) => {
  try {
    const { produto_id, endereco, estoque_contado } = req.body;

    if (!produto_id) return res.status(400).json({ erro: 'Produto é obrigatório' });

    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(produto_id);
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });

    const qtdContada = estoque_contado !== undefined && estoque_contado !== null && estoque_contado !== ''
      ? parseFloat(estoque_contado)
      : null;

    // Verificar se já existe item não ajustado para este produto
    const existente = db.prepare('SELECT * FROM inventario WHERE produto_id = ? AND ajustado = 0').get(produto_id);

    let result;
    if (existente) {
      db.prepare('UPDATE inventario SET estoque_contado = ?, endereco = ?, estoque_sistema = ? WHERE id = ?')
        .run(qtdContada, endereco || produto.endereco_principal || '', produto.estoque_atual, existente.id);
      result = db.prepare('SELECT i.*, p.nome as produto_nome, p.sku, p.unidade, (i.estoque_contado - i.estoque_sistema) as diferenca FROM inventario i JOIN produtos p ON i.produto_id = p.id WHERE i.id = ?').get(existente.id);
    } else {
      const ins = db.prepare(`
        INSERT INTO inventario (produto_id, endereco, estoque_sistema, estoque_contado, ajustado)
        VALUES (?, ?, ?, ?, 0)
      `).run(produto_id, endereco || produto.endereco_principal || '', produto.estoque_atual, qtdContada);
      result = db.prepare('SELECT i.*, p.nome as produto_nome, p.sku, p.unidade, (i.estoque_contado - i.estoque_sistema) as diferenca FROM inventario i JOIN produtos p ON i.produto_id = p.id WHERE i.id = ?').get(ins.lastInsertRowid);
    }

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/inventario/:id/ajustar - Aplicar ajuste automático
router.put('/:id/ajustar', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM inventario WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ erro: 'Item de inventário não encontrado' });
    if (item.ajustado) return res.status(400).json({ erro: 'Este item já foi ajustado' });
    if (item.estoque_contado === null || item.estoque_contado === undefined) {
      return res.status(400).json({ erro: 'Estoque contado não informado' });
    }

    const ajustar = db.transaction(() => {
      const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(item.produto_id);
      const diferenca = item.estoque_contado - item.estoque_sistema;

      if (diferenca === 0) {
        // Apenas marcar como ajustado sem criar movimentação
        db.prepare('UPDATE inventario SET ajustado = 1 WHERE id = ?').run(item.id);
        return { mensagem: 'Sem diferença. Item marcado como conferido.', diferenca: 0 };
      }

      // Criar movimentação de ajuste
      db.prepare(`
        INSERT INTO movimentacoes (produto_id, tipo, quantidade, endereco_origem, endereco_destino, observacao, usuario)
        VALUES (?, 'ajuste', ?, ?, ?, ?, 'inventario')
      `).run(
        item.produto_id,
        diferenca, // pode ser negativo (redução) ou positivo (aumento)
        diferenca < 0 ? item.endereco : null,
        diferenca > 0 ? item.endereco : null,
        `Ajuste de inventário. Sistema: ${item.estoque_sistema} | Contado: ${item.estoque_contado} | Diferença: ${diferenca > 0 ? '+' : ''}${diferenca}`
      );

      // Atualizar estoque do produto
      db.prepare('UPDATE produtos SET estoque_atual = ? WHERE id = ?').run(item.estoque_contado, item.produto_id);

      // Marcar inventário como ajustado
      db.prepare('UPDATE inventario SET ajustado = 1 WHERE id = ?').run(item.id);

      return {
        mensagem: `Ajuste aplicado com sucesso. Diferença: ${diferenca > 0 ? '+' : ''}${diferenca} ${produto.unidade}`,
        diferenca,
        estoque_anterior: item.estoque_sistema,
        estoque_novo: item.estoque_contado
      };
    });

    const resultado = ajustar();
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/inventario/ajustar-todos - Ajustar todas as divergências
router.post('/ajustar-todos', (req, res) => {
  try {
    const itens = db.prepare(`
      SELECT * FROM inventario
      WHERE ajustado = 0 AND estoque_contado IS NOT NULL
    `).all();

    if (itens.length === 0) {
      return res.status(400).json({ erro: 'Nenhum item com contagem para ajustar' });
    }

    const ajustarTodos = db.transaction(() => {
      let ajustados = 0;
      let semDiferenca = 0;

      for (const item of itens) {
        const diferenca = item.estoque_contado - item.estoque_sistema;

        if (diferenca !== 0) {
          const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(item.produto_id);

          db.prepare(`
            INSERT INTO movimentacoes (produto_id, tipo, quantidade, endereco_origem, endereco_destino, observacao, usuario)
            VALUES (?, 'ajuste', ?, ?, ?, ?, 'inventario')
          `).run(
            item.produto_id,
            diferenca,
            diferenca < 0 ? item.endereco : null,
            diferenca > 0 ? item.endereco : null,
            `Ajuste em lote de inventário. Sistema: ${item.estoque_sistema} | Contado: ${item.estoque_contado}`
          );

          db.prepare('UPDATE produtos SET estoque_atual = ? WHERE id = ?').run(item.estoque_contado, item.produto_id);
          ajustados++;
        } else {
          semDiferenca++;
        }

        db.prepare('UPDATE inventario SET ajustado = 1 WHERE id = ?').run(item.id);
      }

      return { ajustados, semDiferenca, total: itens.length };
    });

    const resultado = ajustarTodos();
    res.json({
      mensagem: `Ajuste em lote concluído. ${resultado.ajustados} ajuste(s) gerado(s), ${resultado.semDiferenca} sem diferença.`,
      ...resultado
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/inventario/:id - Remover item NÃO ajustado
router.delete('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM inventario WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ erro: 'Item não encontrado' });
    if (item.ajustado) return res.status(400).json({ erro: 'Item já ajustado não pode ser removido' });

    db.prepare('DELETE FROM inventario WHERE id = ?').run(req.params.id);
    res.json({ mensagem: 'Item removido do inventário' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
