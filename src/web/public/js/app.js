(function () {
  'use strict';

  var TOKEN_KEY = 'delivery.accessToken';
  var CART_KEY = 'delivery.cart';

  var state = {
    token: sessionStorage.getItem(TOKEN_KEY) || null,
    user: null,
    statuses: [],
    products: [],
    cart: JSON.parse(localStorage.getItem(CART_KEY) || '[]'),
    trackedPedidoId: null,
  };

  var STATUS_LABELS = {
    pendente: 'Pendente', confirmado: 'Confirmado', em_preparo: 'Em preparo',
    saiu_para_entrega: 'Saiu para entrega', entregue: 'Entregue', cancelado: 'Cancelado',
  };
  var FLOW = ['pendente', 'confirmado', 'em_preparo', 'saiu_para_entrega', 'entregue'];

  function statusLabel(nome) { return (nome && STATUS_LABELS[nome.toLowerCase()]) || nome || '—'; }

  var STATUS_CLASSES = { pendente: 'st-pendente', confirmado: 'st-confirmado', em_preparo: 'st-em_preparo', saiu_para_entrega: 'st-saiu_para_entrega', entregue: 'st-entregue', cancelado: 'st-cancelado' };
  function statusClass(nome) { return STATUS_CLASSES[(nome || '').toLowerCase()] || 'st-default'; }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function formatMoney(value) {
    var n = Number(value);
    if (isNaN(n)) return String(value);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function formatDate(value) {
    if (!value) return '';
    var d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
    return Promise.resolve();
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-copy]');
    if (!el) return;
    copyToClipboard(el.dataset.copy).then(function () { toast('Link copiado!'); });
  });

  function trackingLinkFor(pedido) {
    if (!pedido || !pedido.trackingToken) return null;
    return window.location.origin + window.location.pathname + '?pedido=' + pedido.trackingToken;
  }

  function toast(message, kind) {
    var area = document.getElementById('toast-area');
    var el = document.createElement('div');
    el.className = 'toast ' + (kind === 'err' ? 'err' : 'ok');
    el.textContent = message;
    area.appendChild(el);
    setTimeout(function () { el.remove(); }, 4500);
  }

  function qs(params) {
    var sp = new URLSearchParams();
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
    });
    var s = sp.toString();
    return s ? '?' + s : '';
  }

  function api(path, options) {
    options = options || {};
    var headers = Object.assign({}, options.headers || {});
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (state.token) headers.Authorization = 'Bearer ' + state.token;
    return fetch(path, Object.assign({}, options, { headers: headers }))
      .then(function (res) {
        if (res.status === 204) return null;
        return res.text().then(function (text) {
          var body = null;
          try { body = text ? JSON.parse(text) : null; } catch (e) { body = null; }
          if (!res.ok) {
            var message = (body && (Array.isArray(body.message) ? body.message.join(', ') : body.message)) || res.statusText;
            var err = new Error(message);
            err.status = res.status;
            throw err;
          }
          return body;
        });
      })
      .catch(function (err) {
        if (err instanceof TypeError) throw new Error('Não foi possível conectar à API. Verifique se ela está no ar.');
        throw err;
      });
  }

  function setToken(token) {
    state.token = token;
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  }
  function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); renderCartBadge(); }

  // ---------- websocket ----------

  var socket = null;
  function connectSocket() {
    if (socket) socket.disconnect();
    socket = io({ auth: state.token ? { token: state.token } : undefined, transports: ['websocket', 'polling'] });
    socket.on('pedido:status-atualizado', function (pedido) {
      toast('Pedido #' + pedido.id + ' atualizado para "' + statusLabel(pedido.status ? pedido.status.nome : '') + '"');
      if (state.trackedPedidoId === pedido.id) renderTrackedOrder(pedido);
      var activeTab = document.querySelector('#tab-meus-pedidos.active');
      if (activeTab) loadMyOrders();
      if (document.querySelector('#tab-admin.active') && !document.getElementById('admin-pedidos').classList.contains('hidden')) loadAllOrders();
    });
  }

  // ---------- tabs ----------

  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (sec) { sec.classList.toggle('active', sec.id === 'tab-' + name); });
    window.scrollTo({ top: 0 });
    if (name === 'cardapio') loadProducts();
    if (name === 'carrinho') renderCart();
    if (name === 'meus-pedidos') { renderMyOrdersGuard(); if (state.token) loadStatuses().then(loadMyOrders); }
    if (name === 'admin') renderAdminGuard();
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-tab]');
    if (!el) return;
    e.preventDefault();
    showTab(el.dataset.tab);
  });

  // ---------- auth ----------

  function renderAuthUi() {
    var slot = document.getElementById('auth-slot');
    var authOnly = document.querySelectorAll('.auth-only');
    var adminOnly = document.querySelectorAll('.admin-only');

    if (state.user) {
      slot.innerHTML = '<a class="btn-ghost" data-tab="meus-pedidos" style="font-weight:700;">' + escapeHtml(state.user.nome.split(' ')[0]) + '</a>' +
        '<button class="btn-ghost icon" id="btn-logout-top" aria-label="Sair">' +
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>' +
        '</button>';
      document.getElementById('btn-logout-top').addEventListener('click', doLogout);
      authOnly.forEach(function (el) { el.classList.remove('hidden'); });
      if (state.user.role === 'admin') adminOnly.forEach(function (el) { el.classList.remove('hidden'); });
      else adminOnly.forEach(function (el) { el.classList.add('hidden'); });

      document.getElementById('conta-deslogado').classList.add('hidden');
      document.getElementById('conta-logado').classList.remove('hidden');
      document.getElementById('conta-info').innerHTML =
        '<p style="font-weight:700;font-size:1.05rem;">' + escapeHtml(state.user.nome) + '</p>' +
        '<p class="hint">' + escapeHtml(state.user.email) + '</p>' +
        '<p style="margin-top:0.5rem;"><span class="role-pill ' + (state.user.role === 'admin' ? 'role-admin' : 'role-cliente') + '">' + (state.user.role === 'admin' ? 'Admin' : 'Cliente') + '</span></p>';
    } else {
      slot.innerHTML = '<a class="btn-outline" data-tab="conta">Entrar</a>';
      authOnly.forEach(function (el) { el.classList.add('hidden'); });
      adminOnly.forEach(function (el) { el.classList.add('hidden'); });
      document.getElementById('conta-deslogado').classList.remove('hidden');
      document.getElementById('conta-logado').classList.add('hidden');
    }
  }

  function doLogout() {
    setToken(null);
    state.user = null;
    renderAuthUi();
    connectSocket();
    toast('Sessão encerrada');
    showTab('cardapio');
  }

  function loadMe() {
    if (!state.token) { state.user = null; renderAuthUi(); return Promise.resolve(); }
    return api('/auth/me')
      .then(function (user) { state.user = user; renderAuthUi(); })
      .catch(function () { setToken(null); state.user = null; renderAuthUi(); });
  }

  document.getElementById('auth-tab-login').addEventListener('click', function () {
    document.getElementById('auth-tab-login').classList.add('active');
    document.getElementById('auth-tab-registro').classList.remove('active');
    document.getElementById('form-login').classList.remove('hidden');
    document.getElementById('form-registro').classList.add('hidden');
  });
  document.getElementById('auth-tab-registro').addEventListener('click', function () {
    document.getElementById('auth-tab-registro').classList.add('active');
    document.getElementById('auth-tab-login').classList.remove('active');
    document.getElementById('form-registro').classList.remove('hidden');
    document.getElementById('form-login').classList.add('hidden');
  });

  document.getElementById('form-login').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('login-email').value.trim();
    var senha = document.getElementById('login-senha').value;
    api('/auth/login', { method: 'POST', body: JSON.stringify({ email: email, senha: senha }) })
      .then(function (res) { setToken(res.accessToken); return loadMe(); })
      .then(function () { connectSocket(); toast('Bem-vindo de volta!'); showTab('cardapio'); })
      .catch(function (err) { toast(err.message, 'err'); });
  });

  document.getElementById('form-registro').addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = document.getElementById('reg-nome').value.trim();
    var email = document.getElementById('reg-email').value.trim();
    var senha = document.getElementById('reg-senha').value;
    api('/auth/register', { method: 'POST', body: JSON.stringify({ nome: nome, email: email, senha: senha }) })
      .then(function (res) { setToken(res.accessToken); return loadMe(); })
      .then(function () { connectSocket(); toast('Conta criada com sucesso!'); showTab('cardapio'); e.target.reset(); })
      .catch(function (err) { toast(err.message, 'err'); });
  });

  // ---------- carrinho ----------

  function cartCount() { return state.cart.reduce(function (acc, i) { return acc + i.quantidade; }, 0); }
  function cartTotal() { return state.cart.reduce(function (acc, i) { return acc + (Number(i.produto.preco) || 0) * i.quantidade; }, 0); }

  function renderCartBadge() {
    var badge = document.getElementById('cart-badge');
    var n = cartCount();
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.classList.toggle('hidden', n === 0);
  }

  function findCartItem(produtoId) {
    return state.cart.find(function (i) { return String(i.produto.id) === String(produtoId); });
  }
  function addToCart(produto, quantidade) {
    quantidade = quantidade || 1;
    var existing = findCartItem(produto.id);
    var max = produto.estoque > 0 ? produto.estoque : Infinity;
    if (existing) existing.quantidade = Math.min(existing.quantidade + quantidade, max);
    else state.cart.push({ produto: produto, quantidade: Math.min(quantidade, max) });
    saveCart();
  }
  function setCartQty(produtoId, quantidade) {
    if (quantidade <= 0) state.cart = state.cart.filter(function (i) { return String(i.produto.id) !== String(produtoId); });
    else { var item = findCartItem(produtoId); if (item) item.quantidade = quantidade; }
    saveCart();
  }
  function removeFromCart(produtoId) {
    state.cart = state.cart.filter(function (i) { return String(i.produto.id) !== String(produtoId); });
    saveCart();
  }

  function renderCart() {
    var el = document.getElementById('carrinho-body');
    if (state.cart.length === 0) {
      el.innerHTML =
        '<div class="card-surface empty-state">' +
        '<svg class="icon lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>' +
        '<p style="font-weight:600;">Seu carrinho está vazio</p>' +
        '<p class="muted">Adicione itens do cardápio para montar seu pedido.</p>' +
        '<button class="btn-primary" data-tab="cardapio">Ver cardápio</button>' +
        '</div>';
      return;
    }

    var rows = state.cart.map(function (item) {
      var max = item.produto.estoque;
      var atMax = max > 0 && item.quantidade >= max;
      return (
        '<li class="card-surface cart-row" data-id="' + item.produto.id + '">' +
        '<img src="/static/img/product-placeholder.jpg" alt="' + escapeHtml(item.produto.nome) + '" />' +
        '<div style="flex:1;min-width:0;">' +
        '<p class="name">' + escapeHtml(item.produto.nome) + '</p>' +
        '<p class="unit">' + formatMoney(item.produto.preco) + ' cada</p>' +
        '</div>' +
        '<div class="qty-stepper">' +
        '<button type="button" class="circle cart-dec" aria-label="Diminuir"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></button>' +
        '<span>' + item.quantidade + '</span>' +
        '<button type="button" class="circle cart-inc" aria-label="Aumentar"' + (atMax ? ' disabled' : '') + '><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>' +
        '</div>' +
        '<div class="lineTotal">' + formatMoney(Number(item.produto.preco) * item.quantidade) + '</div>' +
        '<button type="button" class="btn-ghost icon btn-danger-text cart-remove" aria-label="Remover"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></button>' +
        '</li>'
      );
    }).join('');

    var prefillNome = state.user ? state.user.nome : '';
    var prefillEmail = state.user ? state.user.email : '';

    el.innerHTML =
      '<ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.75rem;">' + rows + '</ul>' +
      '<form id="form-checkout" class="card-surface stack" style="padding:1.25rem;margin-top:1.5rem;">' +
      '<h3 style="font-size:1.1rem;font-weight:700;">Seus dados</h3>' +
      '<p class="hint">Não precisa de conta — informe seu e-mail para acompanhar o pedido.</p>' +
      '<div class="form-grid g2">' +
      '<label class="field-label"><span class="lbl">Nome</span><input type="text" id="co-nome" class="input-field" maxlength="150" placeholder="Seu nome" value="' + escapeHtml(prefillNome) + '" /></label>' +
      '<label class="field-label"><span class="lbl">E-mail <span class="req">*</span></span><input type="email" id="co-email" class="input-field" required maxlength="150" placeholder="voce@email.com" value="' + escapeHtml(prefillEmail) + '" /></label>' +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border);padding-top:1rem;">' +
      '<div><p class="hint">Total</p><p style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:1.5rem;font-weight:800;color:var(--primary);">' + formatMoney(cartTotal()) + '</p></div>' +
      '<button type="submit" class="btn-primary" id="co-submit">Finalizar pedido</button>' +
      '</div>' +
      '</form>';

    el.querySelectorAll('.cart-inc').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.cart-row').dataset.id;
        var item = findCartItem(id);
        addToCart(item.produto, 1);
        renderCart();
      });
    });
    el.querySelectorAll('.cart-dec').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.cart-row').dataset.id;
        var item = findCartItem(id);
        setCartQty(id, item.quantidade - 1);
        renderCart();
      });
    });
    el.querySelectorAll('.cart-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.cart-row').dataset.id;
        removeFromCart(id);
        renderCart();
      });
    });

    document.getElementById('form-checkout').addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = document.getElementById('co-nome').value.trim();
      var email = document.getElementById('co-email').value.trim();
      var payload = {
        cliente: { email: email },
        itens: state.cart.map(function (i) { return { produtoId: i.produto.id, quantidade: i.quantidade }; }),
      };
      if (nome) payload.cliente.nome = nome;
      var submitBtn = document.getElementById('co-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
      api('/orders', { method: 'POST', body: JSON.stringify(payload) })
        .then(function (pedido) {
          state.cart = [];
          saveCart();
          toast('Pedido #' + pedido.id + ' realizado com sucesso!');
          state.trackedPedidoId = pedido.id;
          showTab('rastrear');
          renderTrackedOrder(pedido);
          if (socket) socket.emit('acompanhar-pedido', { pedidoId: pedido.id });
        })
        .catch(function (err) { toast(err.message, 'err'); })
        .finally(function () { submitBtn.disabled = false; submitBtn.textContent = 'Finalizar pedido'; });
    });
  }

  // ---------- cardápio ----------

  function loadProducts() {
    var grid = document.getElementById('produtos-grid');
    var spin = document.getElementById('pr-refresh-spin');
    if (!state.products.length) {
      grid.innerHTML = Array.from({ length: 8 }).map(function () {
        return '<div class="card-surface" style="overflow:hidden;"><div class="skeleton" style="aspect-ratio:4/3;"></div><div style="padding:0.9rem;display:flex;flex-direction:column;gap:0.5rem;"><div class="skeleton" style="height:0.9rem;width:75%;"></div><div class="skeleton" style="height:1.1rem;width:50%;"></div><div class="skeleton" style="height:2.2rem;border-radius:999px;"></div></div></div>';
      }).join('');
    } else {
      spin.classList.remove('hidden');
    }

    api('/products')
      .then(function (produtos) {
        state.products = produtos;
        renderProductsGrid(produtos);
        populateClientOrderSelectsIfNeeded();
      })
      .catch(function (err) {
        grid.innerHTML = '<div class="card-surface empty-state" style="grid-column:1/-1;"><p style="font-weight:600;">Não foi possível carregar o cardápio</p><p class="muted">' + escapeHtml(err.message) + '</p><button class="btn-primary" id="pr-retry">Tentar novamente</button></div>';
        var retry = document.getElementById('pr-retry');
        if (retry) retry.addEventListener('click', loadProducts);
      })
      .finally(function () { spin.classList.add('hidden'); });
  }

  function renderProductsGrid(produtos) {
    var grid = document.getElementById('produtos-grid');
    if (!produtos.length) {
      grid.innerHTML = '<div class="card-surface empty-state" style="grid-column:1/-1;"><p style="font-weight:600;">Cardápio vazio por enquanto</p><p class="muted">Volte em breve — novidades chegando!</p></div>';
      return;
    }
    grid.innerHTML = produtos.map(function (p) {
      var esgotado = p.estoque <= 0;
      var inCart = findCartItem(p.id);
      var tag = '';
      if (esgotado) tag = '<span class="stock-tag out">Esgotado</span>';
      else if (p.estoque <= 5) tag = '<span class="stock-tag low">Restam ' + p.estoque + '</span>';

      var action;
      if (esgotado) {
        action = '<button class="btn-outline" disabled style="width:100%;">Indisponível</button>';
      } else if (inCart) {
        var atMax = p.estoque > 0 && inCart.quantidade >= p.estoque;
        action =
          '<div class="qty-stepper">' +
          '<button type="button" class="circle grid-dec" aria-label="Diminuir"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></button>' +
          '<span>' + inCart.quantidade + '</span>' +
          '<button type="button" class="circle grid-inc" aria-label="Aumentar"' + (atMax ? ' disabled' : '') + '><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>' +
          '</div>';
      } else {
        action = '<button class="btn-primary grid-add" style="width:100%;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>Adicionar</button>';
      }

      return (
        '<article class="card-surface product-card" data-id="' + p.id + '">' +
        '<div class="thumb"><img src="/static/img/product-placeholder.jpg" alt="' + escapeHtml(p.nome) + '" class="' + (esgotado ? 'out' : '') + '" />' + tag + '</div>' +
        '<div class="body">' +
        '<div><h3>' + escapeHtml(p.nome) + '</h3><p class="price">' + formatMoney(p.preco) + '</p></div>' +
        action +
        '</div></article>'
      );
    }).join('');

    grid.querySelectorAll('.grid-add').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.product-card').dataset.id;
        var produto = state.products.find(function (p) { return String(p.id) === String(id); });
        addToCart(produto, 1);
        toast(produto.nome + ' adicionado ao carrinho');
        renderProductsGrid(state.products);
      });
    });
    grid.querySelectorAll('.grid-inc').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.product-card').dataset.id;
        var produto = state.products.find(function (p) { return String(p.id) === String(id); });
        addToCart(produto, 1);
        renderProductsGrid(state.products);
      });
    });
    grid.querySelectorAll('.grid-dec').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.product-card').dataset.id;
        var item = findCartItem(id);
        setCartQty(id, item.quantidade - 1);
        renderProductsGrid(state.products);
      });
    });
  }

  // ---------- rastrear pedido ----------

  function renderTrackedOrder(pedido) {
    var result = document.getElementById('rastrear-result');
    var nome = (pedido.status && pedido.status.nome ? pedido.status.nome : '').toLowerCase();

    var timelineHtml;
    if (nome === 'cancelado') {
      timelineHtml = '<div class="cancel-banner"><svg class="icon lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-5-5H5v18l7-3 7 3z"/></svg><div><p style="font-weight:700;">Pedido cancelado</p><p style="font-size:0.85rem;opacity:.85;">Este pedido foi cancelado.</p></div></div>';
    } else {
      var currentIdx = FLOW.indexOf(nome);
      timelineHtml = '<ol class="timeline">' + FLOW.map(function (step, i) {
        var done = currentIdx > i;
        var current = currentIdx === i;
        var dotCls = done ? 'done' : (current ? 'current' : '');
        return (
          '<li>' +
          '<div class="col">' +
          '<span class="step-dot ' + dotCls + '">' + (done ? '✓' : (i + 1)) + '</span>' +
          (i < FLOW.length - 1 ? '<span class="step-line ' + (done ? 'done' : '') + '"></span>' : '') +
          '</div>' +
          '<div class="step-body">' +
          '<p class="step-title ' + (current ? 'current' : (done ? '' : 'muted')) + '">' + statusLabel(step) + '</p>' +
          (current ? '<p class="step-sub">Status atual do seu pedido</p>' : '') +
          '</div></li>'
        );
      }).join('') + '</ol>';
    }

    var itensHtml = (pedido.itens || []).map(function (item) {
      return (
        '<li style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid var(--border);">' +
        '<img src="/static/img/product-placeholder.jpg" style="width:3rem;height:3rem;border-radius:0.5rem;object-fit:cover;flex-shrink:0;" alt="" />' +
        '<div style="flex:1;min-width:0;"><p style="font-weight:500;">' + escapeHtml(item.produto ? item.produto.nome : 'Produto') + '</p>' +
        '<p class="hint">' + item.quantidade + 'x ' + formatMoney(item.precoUnitario) + '</p></div>' +
        '<span style="font-weight:600;">' + formatMoney(Number(item.precoUnitario) * item.quantidade) + '</span>' +
        '</li>'
      );
    }).join('');

    result.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:1rem;">' +
      '<div><h2 style="font-size:1.3rem;font-weight:700;">Pedido #' + pedido.id + '</h2>' +
      '<p class="hint">Feito em ' + formatDate(pedido.data) + (pedido.cliente ? ' · ' + escapeHtml(pedido.cliente.nome) : '') + '</p></div>' +
      '<span class="badge-status ' + statusClass(nome) + '"><span class="dot"></span>' + statusLabel(nome) + '</span>' +
      '</div>' +
      '<div class="card-surface" style="padding:1.25rem;margin-bottom:1rem;">' +
      '<div class="hint" style="display:flex;align-items:center;gap:0.4rem;margin-bottom:1rem;"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--status-entregue);"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>Atualização em tempo real ativa</div>' +
      timelineHtml +
      '</div>' +
      '<div class="card-surface" style="padding:1.25rem;">' +
      '<h3 style="font-size:1.05rem;font-weight:700;margin-bottom:0.5rem;">Itens do pedido</h3>' +
      '<ul style="list-style:none;margin:0;padding:0;">' + (itensHtml || '<li class="hint">Sem itens</li>') + '</ul>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding-top:0.75rem;margin-top:0.5rem;border-top:1px solid var(--border);">' +
      '<span style="font-weight:600;">Total</span>' +
      '<span style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:1.3rem;font-weight:800;color:var(--primary);">' + formatMoney(pedido.valorTotal) + '</span>' +
      '</div></div>' +
      (function () {
        var link = trackingLinkFor(pedido);
        if (!link) return '';
        return (
          '<div class="card-surface" style="padding:1rem;margin-top:1rem;display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">' +
          '<input readonly class="input-field" style="flex:1;min-width:12rem;" value="' + escapeHtml(link) + '" onclick="this.select();" />' +
          '<button type="button" class="btn-outline" data-copy="' + escapeHtml(link) + '">Copiar link</button>' +
          '</div>' +
          '<p class="hint" style="text-align:center;margin-top:0.75rem;">Qualquer pessoa com este link pode acompanhar o pedido, sem precisar entrar na conta.</p>'
        );
      })();
  }

  // ---------- status ----------

  function loadStatuses() {
    if (!state.token) return Promise.resolve([]);
    return api('/orders-status').then(function (statuses) {
      state.statuses = statuses;
      ['mp-status', 'tp-status'].forEach(function (selectId) {
        var select = document.getElementById(selectId);
        var current = select.value;
        select.innerHTML = '<option value="">Todos</option>' + statuses.map(function (s) {
          return '<option value="' + s.id + '">' + escapeHtml(statusLabel(s.nome)) + '</option>';
        }).join('');
        select.value = current;
      });
      return statuses;
    }).catch(function (err) { toast(err.message, 'err'); return []; });
  }

  function statusSelectHtml(currentId, pedidoId) {
    return '<select class="input-field status-changer" data-id="' + pedidoId + '" style="width:11rem;">' + state.statuses.map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === currentId ? ' selected' : '') + '>' + escapeHtml(statusLabel(s.nome)) + '</option>';
    }).join('') + '</select>';
  }

  // ---------- meus pedidos ----------

  function renderMyOrdersGuard() {
    document.getElementById('mp-logged-out').classList.toggle('hidden', !!state.token);
    document.getElementById('mp-logged-in').classList.toggle('hidden', !state.token);
  }

  function loadMyOrders() {
    var params = {
      statusId: document.getElementById('mp-status').value,
      dataInicio: document.getElementById('mp-data-inicio').value,
      dataFim: document.getElementById('mp-data-fim').value,
    };
    var result = document.getElementById('mp-result');
    result.innerHTML = Array.from({ length: 3 }).map(function () { return '<div class="card-surface skeleton" style="height:5rem;"></div>'; }).join('');
    api('/orders/me' + qs(params))
      .then(function (pedidos) { result.innerHTML = renderOrderCards(pedidos, false); })
      .catch(function (err) {
        result.innerHTML = '<div class="card-surface empty-state"><p style="font-weight:600;">Erro ao carregar seus pedidos</p><p class="muted">' + escapeHtml(err.message) + '</p></div>';
      });
  }
  ['mp-status', 'mp-data-inicio', 'mp-data-fim'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', loadMyOrders);
  });

  function renderOrderCards(pedidos, showCliente) {
    if (!pedidos || !pedidos.length) {
      return '<div class="card-surface empty-state"><svg class="icon lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V5a2 2 0 0 0-2-2h-2"/></svg><p style="font-weight:600;">Nenhum pedido encontrado</p><p class="muted">Ajuste os filtros ou faça seu primeiro pedido!</p></div>';
    }
    return pedidos.map(function (p) {
      var nItens = (p.itens || []).length;
      return (
        '<a href="#" class="card-surface order-card js-track" data-id="' + p.id + '">' +
        '<div style="min-width:0;flex:1;">' +
        '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;">' +
        '<span style="font-weight:600;">Pedido #' + p.id + '</span>' +
        '<span class="badge-status ' + statusClass(p.status ? p.status.nome : '') + '"><span class="dot"></span>' + statusLabel(p.status ? p.status.nome : '') + '</span>' +
        '</div>' +
        '<p class="muted-line">' + (showCliente && p.cliente ? escapeHtml(p.cliente.nome) + ' · ' : '') + formatDate(p.data) + ' · ' + nItens + (nItens === 1 ? ' item' : ' itens') + '</p>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:0.5rem;">' +
        '<span class="order-total">' + formatMoney(p.valorTotal) + '</span>' +
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--muted-foreground);"><path d="m9 18 6-6-6-6"/></svg>' +
        '</div></a>'
      );
    }).join('');
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('.js-track');
    if (!link) return;
    e.preventDefault();
    var id = link.dataset.id;
    showTab('rastrear');
    state.trackedPedidoId = Number(id);
    document.getElementById('rastrear-result').innerHTML = '<div class="card-surface" style="padding:1.5rem;"><div class="skeleton" style="height:8rem;"></div></div>';
    api('/orders/' + id)
      .then(function (pedido) { renderTrackedOrder(pedido); if (socket) socket.emit('acompanhar-pedido', { pedidoId: pedido.id }); })
      .catch(function (err) { toast(err.message, 'err'); });
  });

  // ---------- admin ----------

  function renderAdminGuard() {
    var guard = document.getElementById('admin-guard');
    var body = document.getElementById('admin-body');
    if (!state.user) {
      guard.classList.remove('hidden'); body.classList.add('hidden');
      document.getElementById('admin-guard-title').textContent = 'Área administrativa';
      document.getElementById('admin-guard-text').textContent = 'Entre com uma conta de administrador.';
      document.getElementById('admin-guard-btn').textContent = 'Entrar';
      document.getElementById('admin-guard-btn').dataset.tab = 'conta';
      return;
    }
    if (state.user.role !== 'admin') {
      guard.classList.remove('hidden'); body.classList.add('hidden');
      document.getElementById('admin-guard-title').textContent = 'Acesso restrito';
      document.getElementById('admin-guard-text').textContent = 'Sua conta não tem permissão de administrador.';
      document.getElementById('admin-guard-btn').textContent = 'Voltar ao cardápio';
      document.getElementById('admin-guard-btn').dataset.tab = 'cardapio';
      return;
    }
    guard.classList.add('hidden'); body.classList.remove('hidden');
    loadStatuses().then(function () { loadAllOrders(); loadClientsForFilter(); });
  }

  document.querySelectorAll('.admin-subnav button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.admin-subnav button').forEach(function (b) { b.classList.toggle('active', b === btn); });
      document.querySelectorAll('.admin-tab').forEach(function (sec) { sec.classList.toggle('hidden', sec.id !== 'admin-' + btn.dataset.adminTab); });
      if (btn.dataset.adminTab === 'produtos') loadProductsAdmin();
      if (btn.dataset.adminTab === 'clientes') loadClientsAdmin();
      if (btn.dataset.adminTab === 'pedidos') loadAllOrders();
    });
  });

  function loadClientsForFilter() {
    api('/clients').then(function (clientes) {
      var select = document.getElementById('tp-cliente-id');
      var current = select.value;
      select.innerHTML = '<option value="">Todos</option>' + clientes.map(function (c) {
        return '<option value="' + c.id + '">' + escapeHtml(c.nome) + ' (' + escapeHtml(c.email) + ')</option>';
      }).join('');
      select.value = current;
    }).catch(function () {});
  }

  function loadAllOrders() {
    var params = {
      statusId: document.getElementById('tp-status').value,
      clienteId: document.getElementById('tp-cliente-id').value,
      dataInicio: document.getElementById('tp-data-inicio').value,
      dataFim: document.getElementById('tp-data-fim').value,
    };
    var result = document.getElementById('tp-result');
    api('/orders' + qs(params))
      .then(function (pedidos) {
        result.innerHTML = renderAdminOrderList(pedidos);
        bindAdminOrderActions();
      })
      .catch(function (err) {
        result.innerHTML = '<div class="card-surface empty-state"><p style="font-weight:600;">Erro ao carregar pedidos</p><p class="muted">' + escapeHtml(err.message) + '</p></div>';
      });
  }
  ['tp-status', 'tp-cliente-id', 'tp-data-inicio', 'tp-data-fim'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', loadAllOrders);
  });

  function renderAdminOrderList(pedidos) {
    if (!pedidos || !pedidos.length) {
      return '<div class="card-surface empty-state"><p style="font-weight:600;">Nenhum pedido encontrado</p><p class="muted">Ajuste os filtros para ver mais resultados.</p></div>';
    }
    return pedidos.map(function (p) {
      var itensResumo = (p.itens || []).map(function (i) { return i.quantidade + 'x ' + (i.produto ? escapeHtml(i.produto.nome) : '?'); }).join(' · ');
      return (
        '<div class="card-surface" style="padding:1rem;">' +
        '<div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:0.75rem;">' +
        '<div style="min-width:0;">' +
        '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;">' +
        '<a href="#" class="js-track" data-id="' + p.id + '" style="font-weight:600;">Pedido #' + p.id + '</a>' +
        '<span class="badge-status ' + statusClass(p.status ? p.status.nome : '') + '"><span class="dot"></span>' + statusLabel(p.status ? p.status.nome : '') + '</span>' +
        '</div>' +
        '<p class="hint" style="margin-top:0.25rem;">' + escapeHtml(p.cliente ? p.cliente.nome : '') + ' (' + escapeHtml(p.cliente ? p.cliente.email : '') + ') · ' + formatDate(p.data) + '</p>' +
        '<p class="hint" style="margin-top:0.25rem;">' + itensResumo + '</p>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem;">' +
        '<span style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:1.05rem;font-weight:700;">' + formatMoney(p.valorTotal) + '</span>' +
        statusSelectHtml(p.status ? p.status.id : null, p.id) +
        '</div></div></div>'
      );
    }).join('');
  }

  function bindAdminOrderActions() {
    document.querySelectorAll('#tp-result .status-changer').forEach(function (select) {
      select.addEventListener('change', function () {
        var id = select.dataset.id;
        select.disabled = true;
        api('/orders/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ statusId: Number(select.value) }) })
          .then(function () { toast('Status do pedido #' + id + ' atualizado'); loadAllOrders(); })
          .catch(function (err) { toast(err.message, 'err'); select.disabled = false; });
      });
    });
  }

  // ---------- admin: produtos ----------

  function loadProductsAdmin() {
    var result = document.getElementById('pr-result');
    api('/products')
      .then(function (produtos) {
        state.products = produtos;
        renderCartBadge();
        result.innerHTML = renderProductsTable(produtos);
        bindProductActions();
      })
      .catch(function (err) {
        result.innerHTML = '<div class="card-surface empty-state"><p style="font-weight:600;">Erro ao carregar produtos</p><p class="muted">' + escapeHtml(err.message) + '</p></div>';
      });
  }

  function renderProductsTable(produtos) {
    if (!produtos.length) return '<div class="card-surface empty-state"><p style="font-weight:600;">Nenhum produto cadastrado</p><p class="muted">Crie o primeiro item do cardápio.</p></div>';
    var rows = produtos.map(function (p) {
      return (
        '<tr data-id="' + p.id + '">' +
        '<td style="font-weight:500;">' + escapeHtml(p.nome) + '</td>' +
        '<td>' + formatMoney(p.preco) + '</td>' +
        '<td>' + (p.estoque <= 0 ? '<span class="badge-status st-cancelado"><span class="dot"></span>Esgotado</span>' : p.estoque) + '</td>' +
        '<td><div class="actions-right">' +
        '<button type="button" class="btn-ghost icon pr-edit" aria-label="Editar"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>' +
        '</div></td></tr>'
      );
    }).join('');
    return '<div class="card-surface table-wrap"><table class="data-table"><thead><tr><th>Produto</th><th>Preço</th><th>Estoque</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function bindProductActions() {
    document.querySelectorAll('.pr-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('tr').dataset.id;
        var p = state.products.find(function (x) { return String(x.id) === String(id); });
        openProductForm(p);
      });
    });
  }

  function openProductForm(p) {
    var form = document.getElementById('form-produto');
    form.classList.remove('hidden');
    document.getElementById('pr-form-title').textContent = p ? ('Editar: ' + p.nome) : 'Novo produto';
    document.getElementById('pr-edit-id').value = p ? p.id : '';
    document.getElementById('pr-nome').value = p ? p.nome : '';
    document.getElementById('pr-preco').value = p ? Number(p.preco).toFixed(2) : '';
    document.getElementById('pr-estoque').value = p ? p.estoque : 0;
  }
  function closeProductForm() { document.getElementById('form-produto').classList.add('hidden'); }

  document.getElementById('pr-open-create').addEventListener('click', function () { openProductForm(null); });
  document.getElementById('pr-form-close').addEventListener('click', closeProductForm);
  document.getElementById('pr-form-cancel').addEventListener('click', closeProductForm);
  document.getElementById('form-produto').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('pr-edit-id').value;
    var body = {
      nome: document.getElementById('pr-nome').value.trim(),
      preco: Number(document.getElementById('pr-preco').value.replace(',', '.')),
      estoque: Number(document.getElementById('pr-estoque').value) || 0,
    };
    var req = id ? api('/products/' + id, { method: 'PATCH', body: JSON.stringify(body) }) : api('/products', { method: 'POST', body: JSON.stringify(body) });
    req.then(function () { toast(id ? 'Produto atualizado' : 'Produto criado'); closeProductForm(); loadProductsAdmin(); })
      .catch(function (err) { toast(err.message, 'err'); });
  });

  // ---------- admin: clientes ----------

  function loadClientsAdmin() {
    var result = document.getElementById('cl-result');
    api('/clients')
      .then(function (clientes) { result.innerHTML = renderClientsTable(clientes); bindClientActions(); })
      .catch(function (err) {
        result.innerHTML = '<div class="card-surface empty-state"><p style="font-weight:600;">Erro ao carregar clientes</p><p class="muted">' + escapeHtml(err.message) + '</p></div>';
      });
  }

  function renderClientsTable(clientes) {
    if (!clientes.length) return '<div class="card-surface empty-state"><p style="font-weight:600;">Nenhum cliente cadastrado</p></div>';
    var rows = clientes.map(function (c) {
      return (
        '<tr data-id="' + c.id + '" data-nome="' + escapeHtml(c.nome) + '" data-email="' + escapeHtml(c.email) + '">' +
        '<td style="font-weight:500;">' + escapeHtml(c.nome) + '</td>' +
        '<td class="hint">' + escapeHtml(c.email) + '</td>' +
        '<td><span class="role-pill ' + (c.role === 'admin' ? 'role-admin' : 'role-cliente') + '">' + (c.role === 'admin' ? 'Admin' : 'Cliente') + '</span></td>' +
        '<td><div class="actions-right">' +
        '<button type="button" class="btn-ghost icon cl-edit" aria-label="Editar"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>' +
        '</div></td></tr>'
      );
    }).join('');
    return '<div class="card-surface table-wrap"><table class="data-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function bindClientActions() {
    document.querySelectorAll('.cl-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tr = btn.closest('tr');
        openClientForm({ id: tr.dataset.id, nome: tr.dataset.nome, email: tr.dataset.email });
      });
    });
  }

  function openClientForm(c) {
    var form = document.getElementById('form-cliente');
    form.classList.remove('hidden');
    document.getElementById('cl-form-title').textContent = c ? ('Editar: ' + c.nome) : 'Novo cliente';
    document.getElementById('cl-edit-id').value = c ? c.id : '';
    document.getElementById('cl-nome').value = c ? c.nome : '';
    document.getElementById('cl-email').value = c ? c.email : '';
    document.getElementById('cl-senha').value = '';
    document.getElementById('cl-senha-label').textContent = c ? 'Senha (deixe em branco p/ manter)' : 'Senha (opcional)';
  }
  function closeClientForm() { document.getElementById('form-cliente').classList.add('hidden'); }

  document.getElementById('cl-open-create').addEventListener('click', function () { openClientForm(null); });
  document.getElementById('cl-form-close').addEventListener('click', closeClientForm);
  document.getElementById('cl-form-cancel').addEventListener('click', closeClientForm);
  document.getElementById('form-cliente').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('cl-edit-id').value;
    var senha = document.getElementById('cl-senha').value;
    var body = { nome: document.getElementById('cl-nome').value.trim(), email: document.getElementById('cl-email').value.trim() };
    if (senha) body.senha = senha;
    var req = id ? api('/clients/' + id, { method: 'PATCH', body: JSON.stringify(body) }) : api('/clients', { method: 'POST', body: JSON.stringify(body) });
    req.then(function () { toast(id ? 'Cliente atualizado' : 'Cliente criado'); closeClientForm(); loadClientsAdmin(); })
      .catch(function (err) { toast(err.message, 'err'); });
  });

  function populateClientOrderSelectsIfNeeded() {}

  // ---------- init ----------

  renderCartBadge();
  renderAuthUi();
  connectSocket();
  loadMe().then(function () {
    if (document.querySelector('#tab-meus-pedidos.active')) renderMyOrdersGuard();
  });
  loadProducts();

  (function trackFromQueryLink() {
    var token = new URLSearchParams(window.location.search).get('pedido');
    if (!token) return;
    showTab('rastrear');
    document.getElementById('rastrear-result').innerHTML = '<div class="card-surface" style="padding:1.5rem;"><div class="skeleton" style="height:1.5rem;width:50%;margin-bottom:0.75rem;"></div><div class="skeleton" style="height:8rem;"></div></div>';
    api('/orders/track/' + encodeURIComponent(token))
      .then(function (pedido) {
        state.trackedPedidoId = pedido.id;
        renderTrackedOrder(pedido);
        if (socket) socket.emit('acompanhar-pedido', { pedidoId: pedido.id });
      })
      .catch(function (err) {
        document.getElementById('rastrear-result').innerHTML = '<div class="card-surface empty-state"><p style="font-weight:600;">Pedido não encontrado</p><p class="muted">' + escapeHtml(err.message) + '</p></div>';
      });
  })();
})();
