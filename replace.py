import os

replacements = [
    ('$0.00', '₹0.00'),
    ('$${', '₹${'),
    ('($ USD)', '(₹ INR)'),
]

dirs_to_check = ['templates', 'static/js']

for d in dirs_to_check:
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith(('.html', '.js')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                for old, new in replacements:
                    new_content = new_content.replace(old, new)
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f'Updated {path}')
