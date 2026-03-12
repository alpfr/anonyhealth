import os
import re

with open("src/App.jsx", "r") as f:
    content = f.read()

# Make directories
os.makedirs("src/screens", exist_ok=True)
os.makedirs("src/components", exist_ok=True)
os.makedirs("src/constants", exist_ok=True)

# We will just write a node script or python script here 
# But let's check if there are better ways.
