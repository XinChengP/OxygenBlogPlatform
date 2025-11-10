#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os

def extract_pdf_text(pdf_path):
    try:
        # Try pdfplumber first
        try:
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                return text
        except ImportError:
            print("pdfplumber not available, trying PyPDF2...")
        
        # Try PyPDF2
        try:
            import PyPDF2
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                return text
        except ImportError:
            print("PyPDF2 not available...")
        
        # Fallback: try to read as text and extract readable parts
        with open(pdf_path, 'rb') as f:
            content = f.read()
            # Look for readable text in the binary
            readable_parts = []
            i = 0
            while i < len(content) - 1:
                # Check for UTF-16 encoded text (common in PDFs)
                if content[i:i+2] == b'\x00':
                    if i + 1 < len(content) and 32 <= content[i+1] <= 126:
                        readable_parts.append(chr(content[i+1]))
                    i += 2
                elif content[i+1:i+2] == b'\x00' and 32 <= content[i] <= 126:
                    readable_parts.append(chr(content[i]))
                    i += 2
                else:
                    i += 1
            
            return "".join(readable_parts)
            
    except Exception as e:
        return f"Error extracting PDF: {e}"

if __name__ == "__main__":
    pdf_path = "public\Blogabout\Benou.pdf"
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    
    text = extract_pdf_text(pdf_path)
    print(text)