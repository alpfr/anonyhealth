import os, re

os.makedirs('src/screens', exist_ok=True)

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

blocks = [(14, 72, 'FindProviderDesktop.jsx', 'FindProviderDesktop', [
    'import { useState, useEffect } from "react";',
    'import { T, Icons, Stars } from "../constants/theme";',
    'import { PROVIDERS } from "../data/providers";',
    'import { FilterChip } from "../components/FilterChip";',
    'import { ProviderCard } from "../components/ProviderCard";'
]),
(73, 175, 'ProviderDetailsMobile.jsx', 'ProviderDetailsMobile', [
    'import { T, Icons, Stars } from "../constants/theme";',
    'import { PROVIDERS } from "../data/providers";',
    'import { MobileNav } from "../components/MobileNav";'
]),
(176, 308, 'PatientDashboard.jsx', 'PatientDashboard', [
    'import { useState } from "react";',
    'import { T, Icons } from "../constants/theme";'
]),
(309, 496, 'AIChatMobile.jsx', 'AIChatMobile', [
    'import { useState, useEffect, useRef } from "react";',
    'import { supabase } from "../supabaseClient";',
    'import { T, Icons } from "../constants/theme";',
    'import { MobileNav } from "../components/MobileNav";'
]),
(497, 687, 'RegisterMobile.jsx', 'RegisterMobile', [
    'import { useState } from "react";',
    'import { supabase } from "../supabaseClient";',
    'import { T } from "../constants/theme";',
    'import { MobileNav } from "../components/MobileNav";',
    'import { logAuditEvent } from "../utils/audit";'
]),
(688, 759, 'AnonReviewMobile.jsx', 'AnonReviewMobile', [
    'import { T, Icons } from "../constants/theme";',
    'import { MobileNav } from "../components/MobileNav";'
]),
(760, 870, 'SettingsMobile.jsx', 'SettingsMobile', [
    'import { useState } from "react";',
    'import { supabase } from "../supabaseClient";',
    'import { T, Icons } from "../constants/theme";',
    'import { MobileNav } from "../components/MobileNav";',
    'import { Toggle } from "../components/Toggle";',
    'import { logAuditEvent } from "../utils/audit";'
]),
(871, 982, 'HistoryMobile.jsx', 'HistoryMobile', [
    'import { useState, useEffect } from "react";',
    'import { supabase } from "../supabaseClient";',
    'import { T, Icons } from "../constants/theme";',
    'import { MobileNav } from "../components/MobileNav";'
]),
(983, 1024, 'FindProviderMobile.jsx', 'FindProviderMobile', [
    'import { T, Icons } from "../constants/theme";',
    'import { PROVIDERS } from "../data/providers";',
    'import { MobileNav } from "../components/MobileNav";',
    'import { FilterChip } from "../components/FilterChip";',
    'import { ProviderCard } from "../components/ProviderCard";'
]),
(1027, 1123, 'AboutMobile.jsx', 'AboutMobile', [
    'import { T, Icons } from "../constants/theme";',
    'import { MobileNav } from "../components/MobileNav";'
])]

imports_to_add = []

for s, e, filename, comp_name, imports in blocks:
    content = imports + [""] + [line.rstrip() for line in lines[s:e+1]]
    
    # We need to make sure we export the component
    res_content = []
    for line in content:
        if line.startswith(f"const {comp_name}"):
            res_content.append(line.replace(f"const {comp_name}", f"export const {comp_name}"))
        else:
            res_content.append(line)
            
    with open(f"src/screens/{filename}", "w") as f:
        f.write("\n".join(res_content))
        
    imports_to_add.append(f"import {{ {comp_name} }} from \"./screens/{comp_name}\";")

# Now strip out the blocks from App.jsx
new_lines = []
skip_idx = set()
for s, e, _, _, _ in blocks:
    for i in range(s, e+1):
        skip_idx.add(i)

# add our new imports at line 14
for i, line in enumerate(lines):
    if i == 14:
        new_lines.extend([imp + "\n" for imp in imports_to_add])
        new_lines.append("\n")
    if i not in skip_idx:
        new_lines.append(line)

with open("src/App.jsx", "w") as f:
    f.writelines(new_lines)
