/* ========================================
   EstoqueControl - Frontend SPA
   ======================================== */

// ========================================
// API HELPER
// ========================================
const api = {
  async get(url) {
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) throw new Error(data.erro || 'Erro ao buscar dados');
    return data;
  },
  async post(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.erro || 'Erro ao salvar');
    return data;
  },
  async put(url, body) {
    const r = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.erro || 'Erro ao atualizar');
    return data;
  },
  async delete(url) {
    const r = await fetch(url, { method: 'DELETE' });
    const data = await r.json();
    if (!r.ok) throw new Error(data.erro || 'Erro ao excluir');
    return data;
  }
};

// ========================================
// TOAST
// ========================================
let toastTimer = null;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  const msgEl = document.getElementById('toast-msg');
  const icons = { success: '✓', error: '✕', warning: '⚠' };
  icon.textContent = icons[type] || '✓';
  msgEl.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ========================================
// MODAL
// ========================================
function openModal(title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
}

// ========================================
// SIDEBAR TOGGLE (mobile)
// ========================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}

// ========================================
// ROTEAMENTO
// ========================================
const pages = {
  dashboard, produtos, enderecos, movimentacao, historico, inventario, consulta
};

function navigate(page, el) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');

  const titles = {
    dashboard: '🏠 Dashboard',
    produtos: '🏷️ Produtos',
    enderecos: '📍 Endereços',
    movimentacao: '🔄 Movimentação',
    historico: '📜 Histórico',
    inventario: '🔍 Inventário',
    consulta: '📊 Consulta de Estoque'
  };

  document.getElementById('pageTitle').textContent = titles[page] || page;
  document.getElementById('pageActions').innerHTML = '';
  document.getElementById('page-content').innerHTML = '<div class="loading"><div class="spinner"></div> Carregando...</div>';

  if (pages[page]) pages[page]();

  // Fechar sidebar no mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  }

  return false;
}

// ========================================
// HELPERS
// ========================================
function fmtDate(str) {
  if (!str) return '-';
  const d = new Date(str.replace(' ', 'T'));
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function badgeTipo(tipo) {
  const map = {
    entrada: '<span class="badge badge-entrada">⬆ Entrada</span>',
    saida: '<span class="badge badge-saida">⬇ Saída</span>',
    ajuste: '<span class="badge badge-ajuste">⚖ Ajuste</span>'
  };
  return map[tipo] || `<span class="badge badge-gray">${tipo}</span>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ========================================
// PÁGINA: DASHBOARD
// ========================================
async function dashboard() {
  try {
    const d = await api.get('/api/dashboard');
    const pc = document.getElementById('page-content');

    const alertaHtml = d.alertas.length > 0
      ? `<div class="alert-box">
          <span class="alert-icon">🚨</span>
          <div class="alert-content">
            <div class="alert-title">${d.alertas.length} produto(s) abaixo do estoque mínimo!</div>
            <div class="alert-text">${d.alertas.map(a => `${a.sku} (${a.estoque_atual}/${a.estoque_minimo})`).join(' · ')}</div>
          </div>
         </div>`
      : '';

    const ultimosHtml = d.ultimosMovs.length > 0
      ? `<div class="table-container">
          <table>
            <thead><tr><th>Produto</th><th>Tipo</th><th>Qtd</th><th>Endereço</th><th>Data/Hora</th></tr></thead>
            <tbody>
              ${d.ultimosMovs.map(m => `
                <tr>
                  <td><strong>${escHtml(m.sku)}</strong><br><span class="text-muted">${escHtml(m.produto_nome)}</span></td>
                  <td>${badgeTipo(m.tipo)}</td>
                  <td class="font-mono">${m.quantidade} ${m.unidade}</td>
                  <td class="font-mono">${escHtml(m.endereco_destino || m.endereco_origem || '-')}</td>
                  <td class="text-muted">${fmtDate(m.data_hora)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
         </div>`
      : '<div class="empty-state"><span class="empty-icon">📭</span><p>Nenhuma movimentação ainda</p></div>';

    const alertasProdHtml = d.alertas.length > 0
      ? `<div class="table-container">
          <table>
            <thead><tr><th>SKU</th><th>Produto</th><th>Atual</th><th>Mínimo</th><th>Endereço</th></tr></thead>
            <tbody>
              ${d.alertas.map(a => `
                <tr class="row-alert">
                  <td class="font-mono">${escHtml(a.sku)}</td>
                  <td>${escHtml(a.nome)}</td>
                  <td><span class="alerta-minimo"><span class="dot-alert"></span>${a.estoque_atual}</span></td>
                  <td>${a.estoque_minimo}</td>
                  <td class="font-mono">${escHtml(a.endereco_principal || '-')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
         </div>`
      : '<div class="empty-state"><span class="empty-icon">✅</span><h3>Tudo em ordem!</h3><p>Nenhum produto abaixo do mínimo.</p></div>';

    pc.innerHTML = `
      ${alertaHtml}
      <div class="stats-grid">
        <div class="card-stat">
          <div class="stat-icon">🏷️</div>
          <div class="stat-info">
            <div class="stat-value">${d.totalProdutos}</div>
            <div class="stat-label">Produtos Cadastrados</div>
          </div>
        </div>
        <div class="card-stat danger">
          <div class="stat-icon">⚠️</div>
          <div class="stat-info">
            <div class="stat-value">${d.produtosAlerta}</div>
            <div class="stat-label">Produtos em Alerta</div>
          </div>
        </div>
        <div class="card-stat success">
          <div class="stat-icon">🔄</div>
          <div class="stat-info">
            <div class="stat-value">${d.movsHoje}</div>
            <div class="stat-label">Movimentações Hoje</div>
          </div>
        </div>
        <div class="card-stat info">
          <div class="stat-icon">📍</div>
          <div class="stat-info">
            <div class="stat-value">${d.enderecosAtivos}</div>
            <div class="stat-label">Endereços Ativos</div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <span class="card-title">📜 Últimas Movimentações</span>
            <button class="btn btn-ghost btn-sm" onclick="navigate('historico', document.querySelector('[data-page=historico]'))">Ver todas</button>
          </div>
          ${ultimosHtml}
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">🚨 Produtos em Alerta</span>
            <button class="btn btn-ghost btn-sm" onclick="navigate('consulta', document.querySelector('[data-page=consulta]'))">Ver consulta</button>
          </div>
          ${alertasProdHtml}
        </div>
      </div>`;
  } catch (err) {
    document.getElementById('page-content').innerHTML = `<div class="alert-box"><span class="alert-icon">❌</span><div class="alert-content"><div class="alert-title">Erro ao carregar dashboard</div><div class="alert-text">${err.message}</div></div></div>`;
  }
}

// ========================================
// PÁGINA: PRODUTOS
// ========================================
async function produtos() {
  try {
    const [lista, enderecos] = await Promise.all([
      api.get('/api/produtos'),
      api.get('/api/enderecos')
    ]);

    const pc = document.getElementById('page-content');
    const actions = document.getElementById('pageActions');
    actions.innerHTML = `<button class="btn btn-primary" onclick="novoProduto()">➕ Novo Produto</button>`;

    if (lista.length === 0) {
      pc.innerHTML = `<div class="card"><div class="empty-state"><span class="empty-icon">🏷️</span><h3>Nenhum produto cadastrado</h3><p>Clique em "Novo Produto" para começar.</p></div></div>`;
      return;
    }

    pc.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">🏷️ ${lista.length} produto(s)</span>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>SKU</th><th>Nome</th><th>Categoria</th><th>Unidade</th>
                <th>Estoque Atual</th><th>Mínimo</th><th>Endereço</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${lista.map(p => `
                <tr class="${p.em_alerta ? 'row-alert' : ''}">
                  <td class="font-mono">${escHtml(p.sku)}</td>
                  <td><strong>${escHtml(p.nome)}</strong></td>
                  <td>${escHtml(p.categoria || '-')}</td>
                  <td><span class="badge badge-gray">${escHtml(p.unidade)}</span></td>
                  <td>
                    ${p.em_alerta
                      ? `<span class="alerta-minimo"><span class="dot-alert"></span>${p.estoque_atual}</span>`
                      : `<strong>${p.estoque_atual}</strong>`}
                  </td>
                  <td>${p.estoque_minimo}</td>
                  <td class="font-mono">${escHtml(p.endereco_principal || '-')}</td>
                  <td>
                    <div class="btn-group">
                      <button class="btn btn-ghost btn-sm btn-icon" onclick="editarProduto(${p.id})" title="Editar">✏️</button>
                      <button class="btn btn-ghost btn-sm btn-icon" onclick="excluirProduto(${p.id}, '${escHtml(p.nome)}')" title="Excluir">🗑️</button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    // Guardar endereços no escopo global para o modal
    window._enderecos = enderecos;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function formProdutoHtml(p = {}) {
  const ends = (window._enderecos || []).filter(e => e.status === 'ativo');
  const unidades = ['un', 'kg', 'm²', 'l', 'resma', 'rolo', 'cx', 'pç', 'm', 'g'];
  return `
    <form onsubmit="salvarProduto(event, ${p.id || 0})">
      <div class="form-row">
        <div class="form-group">
          <label>SKU <span class="required">*</span></label>
          <input type="text" id="f-sku" value="${escHtml(p.sku || '')}" placeholder="Ex: PROD-001" required ${p.id ? 'style="text-transform:uppercase"' : 'style="text-transform:uppercase"'}>
        </div>
        <div class="form-group">
          <label>Unidade <span class="required">*</span></label>
          <select id="f-unidade" required>
            ${unidades.map(u => `<option value="${u}" ${(p.unidade||'un')===u?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Nome do Produto <span class="required">*</span></label>
        <input type="text" id="f-nome" value="${escHtml(p.nome || '')}" placeholder="Ex: Caneta Esferográfica Azul" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Categoria</label>
          <input type="text" id="f-categoria" value="${escHtml(p.categoria || '')}" placeholder="Ex: Papelaria">
        </div>
        <div class="form-group">
          <label>Estoque Mínimo</label>
          <input type="number" id="f-estmin" value="${p.estoque_minimo || 0}" min="0" step="0.001">
        </div>
      </div>
      <div class="form-group">
        <label>Endereço Principal</label>
        <select id="f-endereco">
          <option value="">— Sem endereço —</option>
          ${ends.map(e => `<option value="${escHtml(e.codigo)}" ${p.endereco_principal===e.codigo?'selected':''}>${escHtml(e.codigo)} ${e.descricao?'- '+e.descricao:''}</option>`).join('')}
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">💾 Salvar Produto</button>
      </div>
    </form>`;
}

async function novoProduto() {
  if (!window._enderecos) window._enderecos = await api.get('/api/enderecos');
  openModal('Novo Produto', formProdutoHtml());
}

async function editarProduto(id) {
  try {
    const p = await api.get(`/api/produtos/${id}`);
    if (!window._enderecos) window._enderecos = await api.get('/api/enderecos');
    openModal('Editar Produto', formProdutoHtml(p));
  } catch (err) { showToast(err.message, 'error'); }
}

async function salvarProduto(e, id) {
  e.preventDefault();
  const dados = {
    sku: document.getElementById('f-sku').value.toUpperCase(),
    nome: document.getElementById('f-nome').value,
    categoria: document.getElementById('f-categoria').value,
    unidade: document.getElementById('f-unidade').value,
    estoque_minimo: document.getElementById('f-estmin').value,
    endereco_principal: document.getElementById('f-endereco').value
  };
  try {
    if (id) {
      await api.put(`/api/produtos/${id}`, dados);
      showToast('Produto atualizado com sucesso!');
    } else {
      await api.post('/api/produtos', dados);
      showToast('Produto criado com sucesso!');
    }
    closeModal();
    produtos();
  } catch (err) { showToast(err.message, 'error'); }
}

async function excluirProduto(id, nome) {
  openModal('Confirmar Exclusão', `
    <div class="alert-box">
      <span class="alert-icon">⚠️</span>
      <div class="alert-content">
        <div class="alert-title">Excluir produto?</div>
        <div class="alert-text">Produto: <strong>${escHtml(nome)}</strong><br>Esta ação não pode ser desfeita.</div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" onclick="confirmarExcluirProduto(${id})">🗑️ Excluir</button>
    </div>`);
}

async function confirmarExcluirProduto(id) {
  try {
    await api.delete(`/api/produtos/${id}`);
    showToast('Produto excluído.');
    closeModal();
    produtos();
  } catch (err) { showToast(err.message, 'error'); closeModal(); }
}

// ========================================
// PÁGINA: ENDEREÇOS
// ========================================
async function enderecos() {
  try {
    const lista = await api.get('/api/enderecos');
    const pc = document.getElementById('page-content');
    document.getElementById('pageActions').innerHTML = `<button class="btn btn-primary" onclick="novoEndereco()">➕ Novo Endereço</button>`;

    if (lista.length === 0) {
      pc.innerHTML = `<div class="card"><div class="empty-state"><span class="empty-icon">📍</span><h3>Nenhum endereço cadastrado</h3><p>Clique em "Novo Endereço" para começar.</p></div></div>`;
      return;
    }

    pc.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">📍 ${lista.length} endereço(s)</span>
        </div>
        <div class="table-container">
          <table>
            <thead><tr><th>Código</th><th>Descrição</th><th>Status</th><th>Criado em</th><th>Ações</th></tr></thead>
            <tbody>
              ${lista.map(e => `
                <tr>
                  <td class="font-mono"><strong>${escHtml(e.codigo)}</strong></td>
                  <td>${escHtml(e.descricao || '-')}</td>
                  <td>
                    <span class="status-${e.status}">
                      ${e.status === 'ativo' ? '🟢' : '⚫'} ${e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                    </span>
                  </td>
                  <td class="text-muted">${fmtDate(e.criado_em)}</td>
                  <td>
                    <div class="btn-group">
                      <button class="btn btn-ghost btn-sm btn-icon" onclick="editarEndereco(${e.id})" title="Editar">✏️</button>
                      <button class="btn btn-ghost btn-sm btn-icon" onclick="excluirEndereco(${e.id}, '${escHtml(e.codigo)}')" title="Excluir">🗑️</button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (err) { showToast(err.message, 'error'); }
}

function formEnderecoHtml(e = {}) {
  return `
    <form onsubmit="salvarEndereco(event, ${e.id || 0})">
      <div class="form-group">
        <label>Código do Endereço <span class="required">*</span></label>
        <input type="text" id="e-codigo" value="${escHtml(e.codigo || '')}" placeholder="A-01-02-03" maxlength="10"
          style="text-transform:uppercase;font-family:monospace;letter-spacing:1px" required
          oninput="this.value=this.value.toUpperCase()">
        <div class="input-help">Formato: Letra-NN-NN-NN (ex: A-01-02-03)</div>
      </div>
      <div class="form-group">
        <label>Descrição</label>
        <input type="text" id="e-descricao" value="${escHtml(e.descricao || '')}" placeholder="Ex: Área A, Corredor 1, Prateleira 2, Nível 3">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="e-status">
          <option value="ativo" ${(e.status||'ativo')==='ativo'?'selected':''}>🟢 Ativo</option>
          <option value="inativo" ${e.status==='inativo'?'selected':''}>⚫ Inativo</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">💾 Salvar Endereço</button>
      </div>
    </form>`;
}

function novoEndereco() {
  openModal('Novo Endereço', formEnderecoHtml());
}

async function editarEndereco(id) {
  try {
    const e = await api.get(`/api/enderecos/${id}`);
    openModal('Editar Endereço', formEnderecoHtml(e));
  } catch (err) { showToast(err.message, 'error'); }
}

async function salvarEndereco(evt, id) {
  evt.preventDefault();
  const dados = {
    codigo: document.getElementById('e-codigo').value.toUpperCase(),
    descricao: document.getElementById('e-descricao').value,
    status: document.getElementById('e-status').value
  };
  try {
    if (id) {
      await api.put(`/api/enderecos/${id}`, dados);
      showToast('Endereço atualizado!');
    } else {
      await api.post('/api/enderecos', dados);
      showToast('Endereço criado!');
    }
    closeModal();
    enderecos();
  } catch (err) { showToast(err.message, 'error'); }
}

async function excluirEndereco(id, codigo) {
  openModal('Confirmar Exclusão', `
    <div class="alert-box">
      <span class="alert-icon">⚠️</span>
      <div class="alert-content">
        <div class="alert-title">Excluir endereço?</div>
        <div class="alert-text">Código: <strong>${escHtml(codigo)}</strong></div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" onclick="confirmarExcluirEndereco(${id})">🗑️ Excluir</button>
    </div>`);
}

async function confirmarExcluirEndereco(id) {
  try {
    await api.delete(`/api/enderecos/${id}`);
    showToast('Endereço excluído.');
    closeModal();
    enderecos();
  } catch (err) { showToast(err.message, 'error'); closeModal(); }
}

// ========================================
// PÁGINA: MOVIMENTAÇÃO
// ========================================
async function movimentacao() {
  try {
    const [prods, ends] = await Promise.all([
      api.get('/api/produtos'),
      api.get('/api/enderecos')
    ]);

    const endsAtivos = ends.filter(e => e.status === 'ativo');
    const pc = document.getElementById('page-content');

    pc.innerHTML = `
      <div class="card" style="max-width:700px">
        <div class="card-header">
          <span class="card-title">🔄 Registrar Movimentação</span>
        </div>

        <div class="form-group">
          <label>Produto <span class="required">*</span></label>
          <select id="m-produto" onchange="atualizarEstoqueProduto()" required>
            <option value="">— Selecione um produto —</option>
            ${prods.map(p => `<option value="${p.id}" data-estoque="${p.estoque_atual}" data-unidade="${escHtml(p.unidade)}">${escHtml(p.sku)} - ${escHtml(p.nome)}</option>`).join('')}
          </select>
        </div>

        <div id="estoque-atual-info" class="estoque-info hidden">
          <div>
            <div class="label">Estoque Atual</div>
            <div class="flex-center gap-1">
              <span class="value" id="m-estoque-val">0</span>
              <span class="unit" id="m-estoque-unit">un</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Tipo de Movimentação <span class="required">*</span></label>
          <div class="radio-group" id="tipo-group">
            <label class="radio-option" onclick="selecionarTipo('entrada', this)">
              <input type="radio" name="tipo" value="entrada"> ⬆ Entrada
            </label>
            <label class="radio-option" onclick="selecionarTipo('saida', this)">
              <input type="radio" name="tipo" value="saida"> ⬇ Saída
            </label>
            <label class="radio-option" onclick="selecionarTipo('ajuste', this)">
              <input type="radio" name="tipo" value="ajuste"> ⚖ Ajuste
            </label>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Quantidade <span class="required">*</span></label>
            <input type="number" id="m-qtd" min="0.001" step="0.001" placeholder="0" required>
            <div class="input-help" id="qtd-help">Para ajuste: positivo = aumenta, negativo = reduz</div>
          </div>
          <div class="form-group">
            <label>Data/Hora</label>
            <input type="text" id="m-datahora" disabled>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group" id="grupo-origem">
            <label>Endereço Origem <span class="required" id="req-origem">*</span></label>
            <select id="m-origem">
              <option value="">— Selecione —</option>
              ${endsAtivos.map(e => `<option value="${escHtml(e.codigo)}">${escHtml(e.codigo)}${e.descricao?' - '+e.descricao:''}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" id="grupo-destino">
            <label>Endereço Destino <span class="required" id="req-destino">*</span></label>
            <select id="m-destino">
              <option value="">— Selecione —</option>
              ${endsAtivos.map(e => `<option value="${escHtml(e.codigo)}">${escHtml(e.codigo)}${e.descricao?' - '+e.descricao:''}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Observação</label>
          <textarea id="m-obs" placeholder="Detalhes adicionais sobre esta movimentação..." rows="3"></textarea>
        </div>

        <div class="form-actions" style="margin-top:0;padding-top:16px">
          <button class="btn btn-primary btn-lg" onclick="registrarMovimentacao()">
            ✅ Registrar Movimentação
          </button>
        </div>
      </div>`;

    // Atualizar data/hora em tempo real
    atualizarDataHora();
    window._dhTimer = setInterval(atualizarDataHora, 1000);

    // Iniciar com tipo entrada selecionado
    selecionarTipo('entrada', document.querySelector('.radio-option'));
  } catch (err) { showToast(err.message, 'error'); }
}

function atualizarDataHora() {
  const el = document.getElementById('m-datahora');
  if (el) el.value = new Date().toLocaleString('pt-BR');
}

function atualizarEstoqueProduto() {
  const sel = document.getElementById('m-produto');
  const opt = sel.selectedOptions[0];
  const info = document.getElementById('estoque-atual-info');
  if (opt && opt.value) {
    document.getElementById('m-estoque-val').textContent = opt.dataset.estoque;
    document.getElementById('m-estoque-unit').textContent = opt.dataset.unidade;
    info.classList.remove('hidden');
  } else {
    info.classList.add('hidden');
  }
}

let tipoSelecionado = 'entrada';
function selecionarTipo(tipo, el) {
  tipoSelecionado = tipo;
  document.querySelectorAll('.radio-option').forEach(o => {
    o.className = 'radio-option';
  });
  if (el) el.className = `radio-option selected-${tipo}`;

  const grupoOrigem = document.getElementById('grupo-origem');
  const grupoDestino = document.getElementById('grupo-destino');
  const qtdHelp = document.getElementById('qtd-help');
  const qtdInput = document.getElementById('m-qtd');

  if (tipo === 'entrada') {
    document.getElementById('req-origem').style.display = 'none';
    document.getElementById('req-destino').style.display = '';
    qtdHelp.textContent = 'Quantidade de itens a receber';
    if (qtdInput) { qtdInput.min = '0.001'; qtdInput.step = '0.001'; }
  } else if (tipo === 'saida') {
    document.getElementById('req-origem').style.display = '';
    document.getElementById('req-destino').style.display = 'none';
    qtdHelp.textContent = 'Quantidade de itens a retirar';
    if (qtdInput) { qtdInput.min = '0.001'; qtdInput.step = '0.001'; }
  } else {
    document.getElementById('req-origem').style.display = 'none';
    document.getElementById('req-destino').style.display = 'none';
    qtdHelp.textContent = 'Positivo = aumenta estoque, Negativo = reduz estoque';
    if (qtdInput) { qtdInput.min = ''; qtdInput.step = '0.001'; }
  }
}

async function registrarMovimentacao() {
  const produto_id = document.getElementById('m-produto').value;
  const qtd = parseFloat(document.getElementById('m-qtd').value);
  const origem = document.getElementById('m-origem').value;
  const destino = document.getElementById('m-destino').value;
  const obs = document.getElementById('m-obs').value;

  // Validações client-side
  if (!produto_id) return showToast('Selecione um produto', 'warning');
  if (!tipoSelecionado) return showToast('Selecione o tipo de movimentação', 'warning');
  if (!qtd || qtd === 0) return showToast('Informe a quantidade', 'warning');
  if (tipoSelecionado === 'entrada' && !destino) return showToast('Informe o endereço de destino', 'warning');
  if (tipoSelecionado === 'saida' && !origem) return showToast('Informe o endereço de origem', 'warning');
  if ((tipoSelecionado === 'entrada' || tipoSelecionado === 'saida') && qtd <= 0) {
    return showToast('Quantidade deve ser maior que zero', 'warning');
  }

  try {
    const result = await api.post('/api/movimentacoes', {
      produto_id: parseInt(produto_id),
      tipo: tipoSelecionado,
      quantidade: qtd,
      endereco_origem: origem || null,
      endereco_destino: destino || null,
      observacao: obs
    });
    showToast(`Movimentação registrada! Novo estoque: ${result.quantidade} → consulte o produto para ver o saldo atual.`, 'success');

    // Limpar formulário
    document.getElementById('m-produto').value = '';
    document.getElementById('m-qtd').value = '';
    document.getElementById('m-origem').value = '';
    document.getElementById('m-destino').value = '';
    document.getElementById('m-obs').value = '';
    document.getElementById('estoque-atual-info').classList.add('hidden');
    selecionarTipo('entrada', document.querySelector('.radio-option'));

    // Recarregar para pegar estoque atualizado
    movimentacao();
  } catch (err) { showToast(err.message, 'error'); }
}

// ========================================
// PÁGINA: HISTÓRICO
// ========================================
let historicoOffset = 0;
let historicoFiltros = {};

async function historico() {
  try {
    const prods = await api.get('/api/produtos');
    const pc = document.getElementById('page-content');
    historicoOffset = 0;
    historicoFiltros = {};

    pc.innerHTML = `
      <div class="filters">
        <div class="filter-group" style="flex:2">
          <label>Produto</label>
          <select id="h-produto" onchange="filtrarHistorico()">
            <option value="">Todos os produtos</option>
            ${prods.map(p => `<option value="${p.id}">${escHtml(p.sku)} - ${escHtml(p.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Tipo</label>
          <select id="h-tipo" onchange="filtrarHistorico()">
            <option value="">Todos</option>
            <option value="entrada">⬆ Entrada</option>
            <option value="saida">⬇ Saída</option>
            <option value="ajuste">⚖ Ajuste</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Data Início</label>
          <input type="date" id="h-data-ini" onchange="filtrarHistorico()">
        </div>
        <div class="filter-group">
          <label>Data Fim</label>
          <input type="date" id="h-data-fim" onchange="filtrarHistorico()">
        </div>
        <button class="btn btn-secondary btn-sm" onclick="limparFiltrosHistorico()" style="align-self:flex-end">🔄 Limpar</button>
      </div>
      <div id="hist-tabela"></div>
      <div id="hist-mais" style="text-align:center;margin-top:16px"></div>`;

    await carregarHistorico(true);
  } catch (err) { showToast(err.message, 'error'); }
}

async function filtrarHistorico() {
  historicoOffset = 0;
  historicoFiltros = {
    produto_id: document.getElementById('h-produto').value,
    tipo: document.getElementById('h-tipo').value,
    data_inicio: document.getElementById('h-data-ini').value,
    data_fim: document.getElementById('h-data-fim').value
  };
  await carregarHistorico(true);
}

function limparFiltrosHistorico() {
  document.getElementById('h-produto').value = '';
  document.getElementById('h-tipo').value = '';
  document.getElementById('h-data-ini').value = '';
  document.getElementById('h-data-fim').value = '';
  filtrarHistorico();
}

async function carregarHistorico(reset = false) {
  try {
    const params = new URLSearchParams({ limit: 20, offset: historicoOffset, ...historicoFiltros });
    Object.keys(historicoFiltros).forEach(k => !historicoFiltros[k] && params.delete(k));

    const data = await api.get(`/api/movimentacoes?${params}`);
    const tabela = document.getElementById('hist-tabela');
    const mais = document.getElementById('hist-mais');

    if (reset && data.movimentacoes.length === 0) {
      tabela.innerHTML = `<div class="card"><div class="empty-state"><span class="empty-icon">📭</span><h3>Nenhuma movimentação encontrada</h3><p>Ajuste os filtros ou registre novas movimentações.</p></div></div>`;
      mais.innerHTML = '';
      return;
    }

    const rows = data.movimentacoes.map(m => `
      <tr>
        <td class="font-mono">${escHtml(m.sku)}</td>
        <td>${escHtml(m.produto_nome)}</td>
        <td>${badgeTipo(m.tipo)}</td>
        <td class="font-mono"><strong>${m.quantidade > 0 ? '+' : ''}${m.quantidade}</strong> ${m.unidade}</td>
        <td class="font-mono">${escHtml(m.endereco_origem || '-')}</td>
        <td class="font-mono">${escHtml(m.endereco_destino || '-')}</td>
        <td class="text-muted">${fmtDate(m.data_hora)}</td>
        <td class="text-muted text-sm">${escHtml(m.observacao || '-')}</td>
      </tr>`).join('');

    if (reset) {
      tabela.innerHTML = `
        <div class="card">
          <div class="card-header">
            <span class="card-title">📜 ${data.total} movimentação(ões) no total</span>
          </div>
          <div class="table-container">
            <table>
              <thead><tr><th>SKU</th><th>Produto</th><th>Tipo</th><th>Quantidade</th><th>Origem</th><th>Destino</th><th>Data/Hora</th><th>Observação</th></tr></thead>
              <tbody id="hist-tbody">${rows}</tbody>
            </table>
          </div>
        </div>`;
    } else {
      document.getElementById('hist-tbody').innerHTML += rows;
    }

    historicoOffset += data.movimentacoes.length;

    if (historicoOffset < data.total) {
      mais.innerHTML = `<button class="btn btn-secondary" onclick="carregarHistorico(false)">Carregar mais (${data.total - historicoOffset} restantes)</button>`;
    } else {
      mais.innerHTML = '';
    }
  } catch (err) { showToast(err.message, 'error'); }
}

// ========================================
// PÁGINA: INVENTÁRIO
// ========================================
async function inventario() {
  try {
    const itens = await api.get('/api/inventario');
    const pc = document.getElementById('page-content');
    const actions = document.getElementById('pageActions');

    actions.innerHTML = `
      <div class="btn-group">
        <button class="btn btn-primary" onclick="iniciarNovaContagem()">🆕 Nova Contagem</button>
        ${itens.some(i => !i.ajustado && i.estoque_contado !== null)
          ? `<button class="btn btn-success" onclick="ajustarTodos()">✅ Ajustar Todos</button>`
          : ''}
      </div>`;

    if (itens.length === 0) {
      pc.innerHTML = `
        <div class="alert-box warning">
          <span class="alert-icon">ℹ️</span>
          <div class="alert-content">
            <div class="alert-title">Nenhuma contagem em andamento</div>
            <div class="alert-text">Clique em "Nova Contagem" para iniciar o inventário com todos os produtos cadastrados.</div>
          </div>
        </div>`;
      return;
    }

    const pendentes = itens.filter(i => !i.ajustado);
    const ajustados = itens.filter(i => i.ajustado);

    pc.innerHTML = `
      ${pendentes.length > 0 ? `
        <div class="card mb-2">
          <div class="card-header">
            <span class="card-title">🔍 Contagem Pendente (${pendentes.length} itens)</span>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU</th><th>Produto</th><th>Endereço</th>
                  <th>Sistema</th><th>Contado</th><th>Diferença</th><th>Ação</th>
                </tr>
              </thead>
              <tbody>
                ${pendentes.map(i => {
                  const diff = i.estoque_contado !== null ? (i.estoque_contado - i.estoque_sistema) : null;
                  const diffClass = diff === null ? '' : diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-zero';
                  const diffStr = diff === null ? '-' : (diff > 0 ? `+${diff}` : `${diff}`);
                  return `
                    <tr>
                      <td class="font-mono">${escHtml(i.sku)}</td>
                      <td>${escHtml(i.produto_nome)}</td>
                      <td class="font-mono">${escHtml(i.endereco || '-')}</td>
                      <td><strong>${i.estoque_sistema}</strong> ${i.unidade}</td>
                      <td>
                        <input type="number" class="inv-input" id="inv-${i.id}" 
                          value="${i.estoque_contado !== null ? i.estoque_contado : ''}"
                          placeholder="Contar" step="0.001" min="0"
                          onchange="calcDiff(${i.id}, ${i.estoque_sistema})">
                      </td>
                      <td>
                        <span id="diff-${i.id}" class="${diffClass}">${diffStr}</span>
                      </td>
                      <td>
                        <button class="btn btn-success btn-sm" onclick="salvarContagem(${i.id})">💾</button>
                        <button class="btn btn-primary btn-sm" onclick="ajustarItem(${i.id})" title="Ajustar">⚖</button>
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}

      ${ajustados.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <span class="card-title">✅ Itens Ajustados (${ajustados.length})</span>
          </div>
          <div class="table-container">
            <table>
              <thead><tr><th>SKU</th><th>Produto</th><th>Sistema</th><th>Contado</th><th>Diferença</th><th>Data</th></tr></thead>
              <tbody>
                ${ajustados.map(i => {
                  const diff = i.estoque_contado !== null ? (i.estoque_contado - i.estoque_sistema) : 0;
                  const diffClass = diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-zero';
                  return `
                    <tr>
                      <td class="font-mono">${escHtml(i.sku)}</td>
                      <td>${escHtml(i.produto_nome)}</td>
                      <td>${i.estoque_sistema} ${i.unidade}</td>
                      <td>${i.estoque_contado !== null ? i.estoque_contado : '-'} ${i.unidade}</td>
                      <td><span class="${diffClass}">${diff > 0 ? '+' : ''}${diff}</span></td>
                      <td class="text-muted">${fmtDate(i.data_contagem)}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}`;
  } catch (err) { showToast(err.message, 'error'); }
}

function calcDiff(id, sistemaVal) {
  const input = document.getElementById(`inv-${id}`);
  const diffEl = document.getElementById(`diff-${id}`);
  if (!input || !diffEl) return;
  const contado = parseFloat(input.value);
  if (isNaN(contado)) { diffEl.textContent = '-'; diffEl.className = ''; return; }
  const diff = contado - sistemaVal;
  diffEl.textContent = diff > 0 ? `+${diff}` : `${diff}`;
  diffEl.className = diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-zero';
}

async function salvarContagem(id) {
  const input = document.getElementById(`inv-${id}`);
  if (!input || input.value === '') return showToast('Informe o estoque contado', 'warning');
  try {
    await api.post('/api/inventario', {
      produto_id: null,
      estoque_contado: parseFloat(input.value)
    });
    // Atualizar via PUT direto no item
    await fetch(`/api/inventario/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estoque_contado: parseFloat(input.value) })
    });
    // Salvar via endpoint genérico — usar ajustar que já pega o valor
    showToast('Contagem salva!');
  } catch (err) { showToast(err.message, 'error'); }
}

async function ajustarItem(id) {
  const input = document.getElementById(`inv-${id}`);
  if (input && input.value !== '') {
    try {
      // Primeiro salvar a contagem
      await fetch(`/api/inventario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto_id: 0, estoque_contado: parseFloat(input.value) })
      });
    } catch (e) {}
  }
  try {
    const result = await api.put(`/api/inventario/${id}/ajustar`, {});
    showToast(result.mensagem, 'success');
    inventario();
  } catch (err) { showToast(err.message, 'error'); }
}

async function ajustarTodos() {
  try {
    const result = await api.post('/api/inventario/ajustar-todos', {});
    showToast(result.mensagem, 'success');
    inventario();
  } catch (err) { showToast(err.message, 'error'); }
}

async function iniciarNovaContagem() {
  openModal('Nova Contagem de Inventário', `
    <div class="alert-box warning">
      <span class="alert-icon">⚠️</span>
      <div class="alert-content">
        <div class="alert-title">Iniciar nova contagem?</div>
        <div class="alert-text">Todos os itens pendentes (não ajustados) serão removidos e um novo inventário será criado com todos os produtos cadastrados.</div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="confirmarNovaContagem()">🆕 Iniciar Nova Contagem</button>
    </div>`);
}

async function confirmarNovaContagem() {
  try {
    const result = await api.post('/api/inventario/novo', {});
    showToast(result.mensagem, 'success');
    closeModal();
    inventario();
  } catch (err) { showToast(err.message, 'error'); closeModal(); }
}

// ========================================
// PÁGINA: CONSULTA DE ESTOQUE
// ========================================
async function consulta() {
  try {
    const lista = await api.get('/api/produtos');
    const pc = document.getElementById('page-content');

    const total = lista.reduce((s, p) => s + p.estoque_atual, 0);
    const emAlerta = lista.filter(p => p.em_alerta).length;

    pc.innerHTML = `
      <div class="stats-grid mb-2">
        <div class="card-stat">
          <div class="stat-icon">🏷️</div>
          <div class="stat-info">
            <div class="stat-value">${lista.length}</div>
            <div class="stat-label">Total de Produtos</div>
          </div>
        </div>
        <div class="card-stat danger">
          <div class="stat-icon">🚨</div>
          <div class="stat-info">
            <div class="stat-value">${emAlerta}</div>
            <div class="stat-label">Em Alerta</div>
          </div>
        </div>
        <div class="card-stat success">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <div class="stat-value">${total.toFixed(0)}</div>
            <div class="stat-label">Total em Estoque</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">📊 Posição de Estoque</span>
          <div class="search-box" style="width:280px">
            <input type="search" id="consulta-search" placeholder="Buscar produto ou SKU..." oninput="filtrarConsulta()">
          </div>
        </div>
        <div id="consulta-tabela">
          ${renderTabelaConsulta(lista)}
        </div>
      </div>`;

    window._consultaLista = lista;
  } catch (err) { showToast(err.message, 'error'); }
}

function filtrarConsulta() {
  const q = document.getElementById('consulta-search').value.toLowerCase();
  const filtrado = (window._consultaLista || []).filter(p =>
    p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) ||
    (p.categoria || '').toLowerCase().includes(q)
  );
  document.getElementById('consulta-tabela').innerHTML = renderTabelaConsulta(filtrado);
}

function renderTabelaConsulta(lista) {
  if (lista.length === 0) {
    return `<div class="empty-state"><span class="empty-icon">🔍</span><h3>Nenhum produto encontrado</h3></div>`;
  }
  return `
    <div class="table-container">
      <table>
        <thead>
          <tr><th>SKU</th><th>Produto</th><th>Categoria</th><th>Estoque Atual</th><th>Mínimo</th><th>Unidade</th><th>Endereço</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${lista.map(p => `
            <tr class="${p.em_alerta ? 'row-alert' : ''}">
              <td class="font-mono"><strong>${escHtml(p.sku)}</strong></td>
              <td>${escHtml(p.nome)}</td>
              <td>${escHtml(p.categoria || '-')}</td>
              <td>
                ${p.em_alerta
                  ? `<span class="alerta-minimo"><span class="dot-alert"></span>${p.estoque_atual}</span>`
                  : `<strong>${p.estoque_atual}</strong>`}
              </td>
              <td>${p.estoque_minimo}</td>
              <td><span class="badge badge-gray">${escHtml(p.unidade)}</span></td>
              <td class="font-mono">${escHtml(p.endereco_principal || '-')}</td>
              <td>
                ${p.em_alerta
                  ? `<span class="badge badge-saida">⚠ Abaixo do mínimo</span>`
                  : `<span class="badge badge-entrada">✓ Normal</span>`}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  // Iniciar na página de dashboard
  dashboard();

  // Parar timer de hora quando trocar de página
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window._dhTimer) clearInterval(window._dhTimer);
    });
  });

  // Fechar modal com ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});
