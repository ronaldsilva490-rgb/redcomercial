import { useEffect, useState, useRef, useCallback } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, X, ChevronRight, Camera, CameraOff } from 'lucide-react'
import CaixaBlocker from '../../components/CaixaBlocker'
import api from '../../services/api'
import { formatMoney } from '../../utils/format'
import useAuthStore from '../../store/authStore'
import { startBarcodeScanner, isBarcodeDetectorSupported } from '../../utils/barcode'
import PixModal from '../../components/ui/PixModal'
import toast from 'react-hot-toast'

const FORMAS = ['Dinheiro', 'PIX', 'Cartão Débito', 'Cartão Crédito', 'Transferência', 'Fiado']

export default function PDV() {
  const { tenant, papel } = useAuthStore()
  const isRest   = tenant?.tipo === 'restaurante'
  const isCom    = tenant?.tipo === 'comercio'
  const isGarcom = papel === 'garcom'

  const [products,    setProducts]    = useState([])
  const [cart,        setCart]        = useState([])
  const [search,      setSearch]      = useState('')
  const [categoria,   setCategoria]   = useState('')
  const [cats,        setCats]        = useState([])
  const [tables,      setTables]      = useState([])
  const [clients,     setClients]     = useState([])
  const [selTable,    setSelTable]    = useState('')
  const [selClient,   setSelClient]   = useState('')
  const [obs,         setObs]         = useState('')
  const [forma,       setForma]       = useState('Dinheiro')
  const [processing,  setProcessing]  = useState(false)
  const [successData, setSuccessData] = useState(null)
  const [mobileTab,   setMobileTab]   = useState('products')

  // Barcode scanner (comercio only)
  const [scanning,    setScanning]    = useState(false)
  const [scanError,   setScanError]   = useState('')
  const videoRef   = useRef(null)
  const stopScanFn = useRef(null)
  const searchRef  = useRef()
  const barcodeSupported = isBarcodeDetectorSupported()

  // PIX modal
  const [pixModal,    setPixModal]    = useState(null) // { orderId, total }
  const [pixPaying,   setPixPaying]   = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api.get('/api/products', { params: { ativo: true } }),
        api.get('/api/clients'),
      ])
      const prods = p.data.data || []
      setProducts(prods)
      setClients(c.data.data || [])
      setCats([...new Set(prods.map(x => x.categoria).filter(Boolean))])
      if (isRest) {
        const t = await api.get('/api/tables')
        setTables((t.data.data || []).filter(t => t.status !== 'ocupada'))
      }
    } catch { toast.error("Oops! Não consegui buscar dados do PDV. Tente novamente 😕") }
  }, [isRest])

  useEffect(() => { loadData() }, [loadData])

  // ── Barcode scanner ──
  const handleStartScan = async () => {
    setScanning(true)
    setScanError('')
    // Aguarda o video element estar montado
    setTimeout(async () => {
      if (!videoRef.current) { setScanning(false); return }
      const stop = await startBarcodeScanner(
        videoRef.current,
        (code) => {
          setScanning(false)
          setSearch(code)
          // Tenta achar o produto direto
          const found = products.find(p => p.codigo_barras === code)
          if (found) {
            addToCart(found)
            setSearch('')
            toast.success(`✓ ${found.nome}`)
          } else {
            toast.error(`Código ${code} não encontrado`)
            searchRef.current?.focus()
          }
        },
        (err) => {
          setScanning(false)
          setScanError(err.message)
          toast.error(err.message)
        }
      )
      stopScanFn.current = stop
    }, 100)
  }

  const handleStopScan = () => {
    if (stopScanFn.current) stopScanFn.current()
    stopScanFn.current = null
    setScanning(false)
  }

  // ── Enter em busca = leitura de código de barras (teclado / leitor USB) ──
  const handleSearchKey = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      const found = products.find(p => p.codigo_barras === search.trim())
      if (found) { addToCart(found); setSearch(''); toast.success(`✓ ${found.nome}`) }
      else toast.error(`Código "${search}" não encontrado`)
    }
  }

  const filtered = products.filter(p => {
    const s = search.toLowerCase()
    const matchS = !search || p.nome.toLowerCase().includes(s) || (p.codigo_barras || '').includes(search)
    const matchC = !categoria || p.categoria === categoria
    return matchS && matchC
  })

  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id)
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, qtd: i.qtd + 1 } : i)
      return [...prev, { product, qtd: 1 }]
    })
    if (window.innerWidth <= 768) setMobileTab('cart')
  }

  const changeQtd = (id, d) =>
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, qtd: Math.max(0, i.qtd + d) } : i).filter(i => i.qtd > 0))

  const total = cart.reduce((s, i) => s + i.qtd * parseFloat(i.product.preco_venda), 0)

  // ── Checkout ──
  const handleCheckout = async () => {
    if (!cart.length) return toast.error('O carrinho tá vazio! Que tal adicionar um produto? 🛒')

    // Garçom só pode enviar pedido (restaurante), nunca fechar
    if (isGarcom && !isRest) return toast.error('Você não tem a chave para fechar essa venda 🔒')

    setProcessing(true)
    try {
      const orderBody = { obs: obs || null }
      if (selTable) orderBody.table_id = selTable
      if (selClient) orderBody.client_id = selClient

      const { data: orderRes } = await api.post('/api/orders', orderBody)
      const orderId = orderRes.data.id

      for (const item of cart) {
        await api.post(`/api/orders/${orderId}/items`, {
          product_id: item.product.id,
          nome:       item.product.nome,
          qtd:        item.qtd,
          preco_unit: parseFloat(item.product.preco_venda),
        })
      }

      if (isRest || isGarcom) {
        // Restaurante/garçom: só envia pedido, não fecha
        setSuccessData({ orderId: orderId.slice(0, 8), total, status: 'aberto' })
        setCart([]); setSelTable(''); setSelClient(''); setObs('')
        setMobileTab('products')
        await loadData()
        return
      }

      // Comércio: se forma = PIX, abre modal PIX antes de fechar
      if (forma === 'PIX') {
        setPixModal({ orderId, total })
        setCart([]); setSelTable(''); setSelClient(''); setObs('')
        return
      }

      // Comércio: demais formas, fecha direto
      await api.patch(`/api/orders/${orderId}/status`, { status: 'fechado', forma_pagamento: forma })
      setSuccessData({ orderId: orderId.slice(0, 8), total, status: 'fechado', forma })
      setCart([]); setSelTable(''); setSelClient(''); setObs(''); setForma('Dinheiro')
      setMobileTab('products')

    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao finalizar')
    } finally { setProcessing(false) }
  }

  // ── Confirmar pagamento PIX ──
  const handleConfirmPix = async () => {
    if (!pixModal) return
    setPixPaying(true)
    try {
      await api.patch(`/api/orders/${pixModal.orderId}/status`, {
        status: 'fechado',
        forma_pagamento: 'PIX',
      })
      setSuccessData({ orderId: pixModal.orderId.slice(0, 8), total: pixModal.total, status: 'fechado', forma: 'PIX' })
      setPixModal(null)
      setForma('Dinheiro')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao confirmar PIX')
    } finally { setPixPaying(false) }
  }

  const cartCount = cart.reduce((s, i) => s + i.qtd, 0)

  return (
    <CaixaBlocker>
    <div>
      {/* Mobile tabs */}
      <div className="pdv-tab-bar">
        <button className={`pdv-tab-btn ${mobileTab === 'products' ? 'active' : ''}`} onClick={() => setMobileTab('products')}>
          <Search size={14} /> Produtos
        </button>
        <button className={`pdv-tab-btn ${mobileTab === 'cart' ? 'active' : ''}`} onClick={() => setMobileTab('cart')}>
          <ShoppingCart size={14} />
          Carrinho
          {cartCount > 0 && <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{cartCount}</span>}
        </button>
      </div>

      <div className="pdv-layout" style={{ display: 'flex', gap: 16, height: 'calc(100vh - 96px)' }}>

        {/* ── Products ── */}
        <div className={`pdv-products${mobileTab !== 'products' ? ' pdv-panel-hidden' : ''}`}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Bebas Neue', letterSpacing: 1.5, marginBottom: 12 }}>
              {isRest ? 'PDV / Comanda' : 'PDV / Caixa'}
            </div>

            {/* Busca + scanner */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                <input
                  ref={searchRef}
                  className="input"
                  style={{ paddingLeft: 38 }}
                  placeholder={isCom ? 'Buscar ou código de barras (Enter)...' : 'Buscar item do cardápio...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={handleSearchKey}
                />
              </div>

              {/* Scanner de câmera — só comercio com suporte */}
              {isCom && barcodeSupported && (
                <button
                  className={`btn btn-sm ${scanning ? 'btn-danger' : 'btn-outline'}`}
                  style={{ flexShrink: 0 }}
                  onClick={scanning ? handleStopScan : handleStartScan}
                  title={scanning ? 'Parar câmera' : 'Escanear código de barras pela câmera'}
                >
                  {scanning ? <CameraOff size={14} /> : <Camera size={14} />}
                  {scanning ? 'Parar' : 'Câmera'}
                </button>
              )}
            </div>

            {/* Preview da câmera */}
            {scanning && (
              <div style={{
                marginBottom: 10, borderRadius: 12, overflow: 'hidden',
                border: '2px solid var(--red-border)', position: 'relative',
                background: 'var(--bg4)',
              }}>
                <video ref={videoRef} style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} playsInline muted />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  {/* Viewfinder */}
                  <div style={{
                    width: 200, height: 100,
                    border: '2px solid var(--red)', borderRadius: 8,
                    boxShadow: '0 0 0 2000px rgba(0,0,0,0.4)',
                  }} />
                </div>
                <div style={{
                  position: 'absolute', bottom: 8, left: 0, right: 0,
                  textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.8)',
                }}>
                  Aponte a câmera para o código de barras
                </div>
              </div>
            )}

            {/* Categories */}
            {cats.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['', ...cats].map(c => (
                  <button key={c || '__all'} onClick={() => setCategoria(c)}
                    style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                      background: categoria === c ? 'var(--red)' : 'transparent',
                      borderColor: categoria === c ? 'var(--red)' : 'var(--border)',
                      color: categoria === c ? '#fff' : 'var(--muted)',
                      transition: 'all 0.15s',
                    }}>
                    {c || 'Todos'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Products grid */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, alignContent: 'start', paddingRight: 4 }}>
            {filtered.map(p => (
              <button key={p.id} onClick={() => addToCart(p)}
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
                  padding: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  fontFamily: 'inherit', position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red-border)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
              >
                {p.categoria && <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{p.categoria}</div>}
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, marginBottom: 6 }}>{p.nome}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--red)' }}>{formatMoney(p.preco_venda)}</div>
                {isCom && p.estoque_atual !== undefined && p.estoque_atual <= 0 && (
                  <div style={{ fontSize: 9, color: 'var(--red)', marginTop: 2 }}>Sem estoque</div>
                )}
                {isCom && p.estoque_atual !== undefined && p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo && (
                  <div style={{ fontSize: 9, color: 'var(--yellow)', marginTop: 2 }}>⚠ Estoque baixo</div>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>
                {search ? `Nenhum resultado para "${search}"` : 'Nenhum produto ativo.'}
              </div>
            )}
          </div>
        </div>

        {/* ── Cart ── */}
        <div className={`pdv-cart${mobileTab !== 'cart' ? ' pdv-panel-hidden' : ''}`}
          style={{
            width: 310, background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
          }}>

          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={15} color="var(--red)" />
            <span style={{ fontWeight: 700, fontSize: 13 }}>{isRest ? 'Comanda' : 'Carrinho'}</span>
            {cartCount > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--red)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 7px' }}>
                {cartCount}
              </span>
            )}
          </div>

          {/* Config */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isRest && (
              <select className="input" style={{ fontSize: 12 }} value={selTable} onChange={e => setSelTable(e.target.value)}>
                <option value="">Mesa (opcional)</option>
                {tables.map(t => <option key={t.id} value={t.id}>Mesa {t.numero}</option>)}
              </select>
            )}
            <select className="input" style={{ fontSize: 12 }} value={selClient} onChange={e => setSelClient(e.target.value)}>
              <option value="">Cliente (opcional)</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {!isRest && !isGarcom && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {FORMAS.map(f => (
                    <button key={f} onClick={() => setForma(f)}
                      style={{
                        padding: '7px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                        background: forma === f ? 'var(--red)' : 'var(--bg3)',
                        borderColor: forma === f ? 'var(--red)' : 'var(--border)',
                        color: forma === f ? '#fff' : 'var(--dim)',
                        transition: 'all 0.15s',
                      }}>
                      {f === 'PIX' && '⚡ '}{f}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)', fontSize: 12 }}>
                <ShoppingCart size={28} style={{ opacity: 0.2, marginBottom: 8 }} /><br />
                Toque nos produtos para adicionar
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{item.product.nome}</div>
                      <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700 }}>{formatMoney(item.product.preco_venda * item.qtd)}</div>
                    </div>
                    <button onClick={() => changeQtd(item.product.id, -item.qtd)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2, display: 'flex' }}>
                      <X size={12} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <button onClick={() => changeQtd(item.product.id, -1)}
                      style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg4)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{item.qtd}</span>
                    <button onClick={() => changeQtd(item.product.id, 1)}
                      style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg4)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
                      <Plus size={12} />
                    </button>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{formatMoney(item.product.preco_venda)}/un</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Obs */}
          {cart.length > 0 && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
              <input className="input" style={{ fontSize: 11 }} value={obs}
                onChange={e => setObs(e.target.value)} placeholder="Observação (opcional)" />
            </div>
          )}

          {/* Total + checkout */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Total</span>
              <span style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Bebas Neue', letterSpacing: 1, color: cart.length ? 'var(--text)' : 'var(--muted)' }}>
                {formatMoney(total)}
              </span>
            </div>
            {cart.length > 0 && (
              <button className="btn btn-outline" style={{ width: '100%', marginBottom: 8, fontSize: 11 }} onClick={() => setCart([])}>
                <Trash2 size={12} /> Limpar carrinho
              </button>
            )}
            <button
              className="btn btn-primary"
              style={{ width: '100%', fontSize: 14, padding: '13px', justifyContent: 'center' }}
              disabled={!cart.length || processing}
              onClick={handleCheckout}
            >
              {processing ? (
                <><div className="spinner" style={{ width: 16, height: 16 }} /> Processando...</>
              ) : isRest || isGarcom ? (
                <>📋 Enviar Pedido <ChevronRight size={14} /></>
              ) : forma === 'PIX' ? (
                <>⚡ Gerar PIX <ChevronRight size={14} /></>
              ) : (
                <>💰 Finalizar Venda <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PIX modal */}
      {pixModal && (
        <PixModal
          amount={pixModal.total}
          txid={pixModal.orderId}
          description={`Venda RED #${pixModal.orderId?.slice(0, 8)}`}
          onClose={() => setPixModal(null)}
          onConfirm={handleConfirmPix}
          confirming={pixPaying}
        />
      )}

      {/* Success modal */}
      {successData && (
        <div className="modal-overlay" onClick={() => setSuccessData(null)}>
          <div className="modal" style={{ maxWidth: 340, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '32px 24px 24px' }}>
              <div style={{ color: 'var(--green)', marginBottom: 16 }}>
                <CheckCircle size={52} strokeWidth={1.5} />
              </div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 24, letterSpacing: 1.5, marginBottom: 4 }}>
                {successData.status === 'fechado' ? 'Venda Finalizada!' : 'Pedido Enviado!'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16, fontFamily: 'DM Mono' }}>
                #{successData.orderId}
              </div>
              <div style={{ fontSize: 38, fontWeight: 900, fontFamily: 'Bebas Neue', color: 'var(--green)', letterSpacing: 1, marginBottom: 4 }}>
                {formatMoney(successData.total)}
              </div>
              {successData.forma && successData.status === 'fechado' && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>{successData.forma}</div>
              )}
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSuccessData(null)}>
                {isRest || isGarcom ? 'Novo Pedido' : 'Nova Venda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </CaixaBlocker>
  )
}
