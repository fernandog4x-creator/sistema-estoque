const express = require('express');
const router = express.Router();
const db = require('../database');

// Validar formato do código de endereço (ex: A-01-02-03)
function validarCodigo(codigo) {
  return /^[A-Z]-\d{2}-\d{2}-\d{2}$/.test(codigo);
}

// GET /api/enderecos - Listar todos
router.get('/', (req, res) => {
  try {
    const enderecos = db.prepare('SELECT * FROM enderecos ORDER BY codigo ASC').all();
    res.json(enderecos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/enderecos/:id - Buscar por ID
router.get('/:id', (req, res) => {
  try {
    const endereco = db.prepare('SELECT * FROM enderecos WHERE id = ?').get(req.params.id);
    if (!endereco) return res.status(404).json({ erro: 'Endereço não encontrado' });
    res.json(endereco);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/enderecos - Criar endereço
router.post('/', (req, res) => {
  try {
    const { codigo, descricao, status } = req.body;

    if (!codigo || !codigo.trim()) return res.status(400).json({ erro: 'Código é obrigatório' });

    const codigoFormatado = codigo.trim().toUpperCase();

    if (!validarCodigo(codigoFormatado)) {
      return res.status(400).json({ erro: 'Formato inválido. Use: A-01-02-03 (Letra-NN-NN-NN)' });
    }

    // Verificar duplicado
    const existente = db.prepare('SELECT id FROM enderecos WHERE codigo = ?').get(codigoFormatado);
    if (existente) return res.status(400).json({ erro: 'Código de endereço já cadastrado' });

    const result = db.prepare(`
      INSERT INTO enderecos (codigo, descricao, status)
      VALUES (?, ?, ?)
    `).run(
      codigoFormatado,
      descricao ? descricao.trim() : null,
      status === 'inativo' ? 'inativo' : 'ativo'
    );

    const novo = db.prepare('SELECT * FROM enderecos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(novo);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ erro: 'Código de endereço já cadastrado' });
    }
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/enderecos/:id - Atualizar endereço
router.put('/:id', (req, res) => {
  try {
    const endereco = db.prepare('SELECT * FROM enderecos WHERE id = ?').get(req.params.id);
    if (!endereco) return res.status(404).json({ erro: 'Endereço não encontrado' });

    const { codigo, descricao, status } = req.body;

    if (!codigo || !codigo.trim()) return res.status(400).json({ erro: 'Código é obrigatório' });

    const codigoFormatado = codigo.trim().toUpperCase();

    if (!validarCodigo(codigoFormatado)) {
      return res.status(400).json({ erro: 'Formato inválido. Use: A-01-02-03 (Letra-NN-NN-NN)' });
    }

    // Verificar duplicado em outro endereço
    const existente = db.prepare('SELECT id FROM enderecos WHERE codigo = ? AND id != ?').get(codigoFormatado, req.params.id);
    if (existente) return res.status(400).json({ erro: 'Código já cadastrado em outro endereço' });

    db.prepare(`
      UPDATE enderecos SET codigo = ?, descricao = ?, status = ? WHERE id = ?
    `).run(
      codigoFormatado,
      descricao ? descricao.trim() : null,
      status === 'inativo' ? 'inativo' : 'ativo',
      req.params.id
    );

    const atualizado = db.prepare('SELECT * FROM enderecos WHERE id = ?').get(req.params.id);
    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/enderecos/:id - Deletar endereço
router.delete('/:id', (req, res) => {
  try {
    const endereco = db.prepare('SELECT * FROM enderecos WHERE id = ?').get(req.params.id);
    if (!endereco) return res.status(404).json({ erro: 'Endereço não encontrado' });

    // Verificar se está em uso como endereço principal de produto
    const emUso = db.prepare('SELECT COUNT(*) as total FROM produtos WHERE endereco_principal = ?').get(endereco.codigo);
    if (emUso.total > 0) {
      return res.status(400).json({ erro: `Endereço está vinculado a ${emUso.total} produto(s) e não pode ser excluído` });
    }

    // Verificar se está em movimentações
    const emMovs = db.prepare('SELECT COUNT(*) as total FROM movimentacoes WHERE endereco_origem = ? OR endereco_destino = ?').get(endereco.codigo, endereco.codigo);
    if (emMovs.total > 0) {
      return res.status(400).json({ erro: `Endereço possui ${emMovs.total} movimentação(ões) e não pode ser excluído. Inative-o em vez disso.` });
    }

    db.prepare('DELETE FROM enderecos WHERE id = ?').run(req.params.id);
    res.json({ mensagem: 'Endereço excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
