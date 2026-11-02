import os
import glob
from google import genai

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is missing.")

    client = genai.Client(api_key=api_key)

    # Allowed code and config extensions across virtually any programming language
    valid_extensions = (
        '.py', '.java', '.js', '.ts', '.go', '.rs', '.cpp', '.c', '.h', 
        '.php', '.rb', '.cs', '.sql', '.json', '.yaml', '.yml', '.env.example'
    )

    # Gather codebase context dynamically
    code_context = ""
    file_list = []
    
    for root, dirs, files in os.walk("."):
        # Skip unwanted system and build directories
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', 'venv', '__pycache__', 'target', 'build', 'dist']]
        
        for file in files:
            if file.endswith(valid_extensions) or file.lower() == "readme.md":
                file_path = os.path.join(root, file)
                file_list.append(file_path)
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        code_context += f"\n\n=== FILE: {file_path} ===\n" + f.read()
                except Exception as e:
                    print(f"Skipping {file_path}: {e}")

    # Multidisciplinary IT Master Prompt
    prompt = f"""
    You are a Principal Multi-Disciplinary IT Architect and Senior Security Engineer with deep expertise across software engineering, cybersecurity, network administration, data analytics, and enterprise business systems.

    Review the following multi-language codebase. Refactor and elevate the code to meet production-grade enterprise standards:
    1. **Functional Logic & Code Quality:** Fix all bugs, dead code, and syntax issues. Implement clean, modular, and optimized algorithms.
    2. **Cybersecurity Hardening:** Apply robust input validation, sanitization, secure error handling, safe credential management, and prevention of common vulnerabilities (OWASP top 10).
    3. **Networking & Resilience:** Ensure robust connection timeouts, efficient socket/API communication, error retries, and comprehensive logging/telemetry.
    4. **Data Analytics & Operations:** Where applicable, integrate clean data structures, performance metrics tracking, or structured telemetry logs.
    5. **Business Logic & Adaptability:** Design code to reflect scalable domain models (e.g., modular service layers, clear hooks for CRM/sales operations, or inventory/ledger tracking).
    6. **Documentation (`README.md`):** Rewrite or update the `README.md` to comprehensively detail the architecture, security features, networking configurations, setup instructions, and data flow.

    Provide the output clearly structured file-by-file so that code changes can be parsed or reviewed, ending with the complete updated code and README. 

    Codebase:
    {code_context}
    """

    print("Sending codebase to Gemini for advanced multi-domain refactoring...")
    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=prompt
    )

    # For autonomous execution, you can parse the AI output or use Gemini's structured response 
    # to overwrite files. Here we log the architectural enhancement summary.
    print("--- AI Architectural Refactoring Report ---")
    print(response.text[:2000] + "\n... [Output truncated for log brevity] ...")
    
    # Note: For automated file replacement, you can prompt Gemini to output code in JSON mapping 
    # {"filepath": "new_content"} and write them directly back using Python file I/O.

if __name__ == "__main__":
    main()
  
