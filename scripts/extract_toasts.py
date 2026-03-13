import os
import re
import json

folder = 'c:/Users/Ronyd/Desktop/REDCOMERCIAL/redcomercial/src'
matches = []

# Regex para procurar chamadas de hot-toast: toast.success('MENSAGEM AQUI') ou toast.error("MENSAGEM AQUI")
# Suporta aspas simples, duplas e templates strings.
toast_pattern = re.compile(r'toast\.(success|error|loading|info|custom)\s*\(\s*([\'\"`])(.*?)\2', re.DOTALL)

for root, dirs, files in os.walk(folder):
    for f in files:
        if not f.endswith(('.js', '.jsx', '.ts', '.tsx')): 
            continue
        
        path = os.path.join(root, f)
        with open(path, 'r', encoding='utf-8', errors='ignore') as file:
            content = file.read()
            found = toast_pattern.findall(content)
            
            for m in found:
                action_type = m[0]
                message = m[2].strip()
                # Remove quebras de linha dentro da string pro JSON ficar limpo
                message = message.replace('\n', ' ').replace('\r', '')
                
                matches.append({
                    'file': os.path.relpath(path, folder).replace('\\', '/'),
                    'type': action_type,
                    'original': message
                })

out_path = 'c:/Users/Ronyd/Desktop/REDCOMERCIAL/redcomercial/src/assets/data/toasts.json'
with open(out_path, 'w', encoding='utf-8') as js:
    json.dump(matches, js, indent=2, ensure_ascii=False)
    
print(f"Extraidos {len(matches)} toasts em {out_path} com sucesso.")
