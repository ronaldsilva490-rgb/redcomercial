import os
import re
import json

# ==========================================================
# SUPER DICIONÁRIO DE HUMANIZAÇÃO DE TOASTS
# Substitui termos secos e robóticos por mensagens amigáveis e inteligíveis.
# ==========================================================
MAPPING = {
    # Sucessos Comuns
    "Sessão encerrada": "Você saiu com sucesso! Até logo 👋",
    "Desconectado com sucesso": "Sessão encerrada! Volte sempre 👋",
    "Bem-vindo!": "Seja muito bem-vindo! 🚀",
    "Bem-vindo, Admin!": "Tudo pronto, Chefe! Painel liberado 🚀",
    "Dados atualizados!": "Tudo salvo e atualizado! ✨",
    "Removido": "Item apagado com sucesso! 🗑️",
    
    # Erros Comuns de Formulário
    "Preencha todos os campos": "Ei! Alguns campos obrigatórios ficaram vazios ✍️",
    "Todos os campos são obrigatórios": "Por favor, preencha todos os espaços em branco! ✍️",
    "Senha deve ter no mínimo 6 caracteres": "A senha é super secreta! Precisa ter no mínimo 6 caracteres 🔐",
    "Senha deve ter no mínimo 8 caracteres": "Sua senha precisa ser um pouco maior (mínimo 8 dígitos) 🔐",
    "Senhas não coincidem": "Ops! As duas senhas que você digitou estão diferentes 🧐",
    
    # Fotos
    "Foto enviada!": "Foto anexada com sucesso! 📸",
    "Erro no upload — foto salva localmente": "Não consegui enviar a foto agora, mas salvei ela aqui! ⚠️",

    # Admin & Usuários
    "Administrador criado com sucesso": "Novo administrador está na área! 👑",
    "Admin desativado": "Administrador temporariamente na geladeira 🧊",
    "Admin removido": "Conta de admin apagada definitivamente! 🗑️",
    "Erro ao desativar": "Deu um errinho ao tentar desativar... 😕",
    "Erro ao deletar": "Puxa, não consegui apagar o registro agora 😕",
    "Nome é obrigatório": "Como podemos te chamar? O nome é obrigatório! 👤",
    "Login e senha são obrigatórios": "Crie um login e senha para essa pessoa, por favor! 🔑",
    "Este nome de usuário já está em uso": "Putz, esse username já tem dono! Tente outro 😅",
    "Funcionário cadastrado! ✅": "Novo membro do time cadastrado com sucesso! 🎉",
    "Papel atualizado": "O cargo desse usuário acabou de ser alterado! 🛠️",
    
    # Vendas & PDV
    "Carrinho vazio": "O carrinho tá vazio! Que tal adicionar um produto? 🛒",
    "Código não encontrado": "Não achamos esse código de barras nas prateleiras 🕵️‍♂️",
    "Sem permissão para finalizar venda": "Você não tem a chave para fechar essa venda 🔒",
    "Venda registrada com sucesso!": "Venda concluída! Dinheiro no bolso 💰",
    "Gerando contrato...": "Aguarde só um segundo, estamos montando o contrato 📝...",
    "Contrato gerado!": "Contrato montadinho e pronto para assinar! 📜",
    "Venda cancelada": "Venda desfeita! Acontece nas melhores famílias 🔄",
    "Venda criada! Itens de cozinha foram enviados. 🍳": "Show! O pedido foi lá pra cozinha 🍳",
    
    # Produtos, Estoque & Clientes
    "Erro ao carregar produtos": "A prateleira emperrou, não consegui carregar os produtos 📦",
    "Erro ao carregar clientes": "Agenda sumiu! Não consegui buscar a lista de clientes 👥",
    "Cliente cadastrado!": "É isso aí! Novo cliente salvo na casa 🎉",
    "Selecione um cliente": "Para quem é essa venda? Selecione um cliente da lista! 🧑‍💼",
    "Produto atualizado!": "Prontinho! Detalhes do produto foram salvos 🏷️",
    "Preço de venda é obrigatório": "Tudo tem seu preço! Conta pra gente quanto isso custa 💵",
    
    # Financeiro e Caixa
    "Caixa aberto! Bom expediente ✅": "Caixa aberto e brilhando! Vamo que vamo 🚀",
    "Caixa fechado! Até amanhã 👋": "Caixa trancado! Descanso merecido 👋",
    "Conta cadastrada!": "Pronto, continha foi pra lista do devedor 💸",
    "Marcado como pago!": "Dinheiro no caixa! Conta paga com sucesso 💲",
    "Data de vencimento é obrigatória": "Sem data não rola... Quando essa conta vence? 🗓️",
    
    # Garçom / Mesas / Delivery
    "Nenhuma comanda aberta": "Ei! Não tem nenhuma comanda rolando nessa mesa 🤷‍♂️",
    "Adicione itens ao carrinho primeiro": "Coloca alguma coisa na bandeja antes de fechar! 🍽️",
    "Pedido enviado! 🍽️": "Anotado! Pedido disparado lá pra trás 🚀",
    "Caixa notificado! 🔔": "Demos um toque no pessoal do Caixa! 🛎️",
    "Delivery criado! 🛵": "Bora acelerar! Entrega foi agendada 🛵",
    "🛵 Saindo para entrega!": "Saindo do forno para a casa do cliente! Vrumm 🛵",
    "Comanda fechada! ✅": "Conta fechada! Mais uma mesa bem servida 🧾",
}

folder = 'c:/Users/Ronyd/Desktop/REDCOMERCIAL/redcomercial/src'
updated_files = 0
replaced_count = 0

for root, dirs, files in os.walk(folder):
    for f in files:
        if not f.endswith(('.js', '.jsx', '.ts', '.tsx')): continue
        
        path = os.path.join(root, f)
        with open(path, 'r', encoding='utf-8', errors='ignore') as file:
            content = file.read()
            original_content = content
            
        # Para cada termo no nosso dicionário, se for encontrado no formato toast(original) -> substitui
        for old_txt, new_txt in MAPPING.items():
            pattern1 = f'toast.success("{old_txt}")'
            pattern2 = f"toast.success('{old_txt}')"
            pattern3 = f'toast.error("{old_txt}")'
            pattern4 = f"toast.error('{old_txt}')"
            pattern5 = f'toast.loading("{old_txt}")'
            pattern6 = f"toast.loading('{old_txt}')"
            
            # Repasses Literais
            content = content.replace(pattern1, f'toast.success("{new_txt}")')
            content = content.replace(pattern2, f"toast.success('{new_txt}')")
            content = content.replace(pattern3, f'toast.error("{new_txt}")')
            content = content.replace(pattern4, f"toast.error('{new_txt}')")
            content = content.replace(pattern5, f'toast.loading("{new_txt}")')
            content = content.replace(pattern6, f"toast.loading('{new_txt}')")
            
        # Pega as flexões mais genéricas para varrer o que sobrou: Erro ao carregar [...]
        content = re.sub(r'toast\.error\([\'"]Erro ao carregar (.+?)[\'"]\)', r'toast.error("Oops! Não consegui buscar \1. Tente novamente 😕")', content)
        content = re.sub(r'toast\.error\([\'"]Erro ao atualizar (.+?)[\'"]\)', r'toast.error("Vixe... não consegui salvar a alteração em \1 😕")', content)
        content = re.sub(r'toast\.error\([\'"]Erro ao remover (.+?)[\'"]\)', r'toast.error("Travou! Não consegui apagar \1 da lista 🗑️")', content)
        content = re.sub(r'toast\.error\([\'"]Erro interno(.+?)[\'"]\)', r'toast.error("Deu um tilt aqui no servidor... Nossa equipe já foi avisada! 🛠️")', content)

        if content != original_content:
            with open(path, 'w', encoding='utf-8') as out_f:
                out_f.write(content)
            updated_files += 1

print(f"Modificação massiva completa. {updated_files} arquivos frontend tiveram suas notificações humanizadas pelo script.")
