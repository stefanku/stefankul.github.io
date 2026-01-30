#!/usr/bin/env python3
"""
CV Generator - Converts JSON data + HTML template to PDF

Usage:
    python generate_cv.py                           # Generate PDF from default data
    python generate_cv.py --data custom.json        # Use custom JSON data
    python generate_cv.py --template custom.html    # Use custom template
    python generate_cv.py --output my_cv.pdf        # Custom output filename
    python generate_cv.py --html                    # Also output HTML file

Requirements:
    pip install jinja2 weasyprint

Note: On macOS, you may need to install additional dependencies:
    brew install pango cairo libffi
"""

import argparse
import json
import sys
from pathlib import Path

try:
    from jinja2 import Environment, FileSystemLoader
except ImportError:
    print("Error: jinja2 not installed. Run: pip install jinja2")
    sys.exit(1)

try:
    from weasyprint import HTML, CSS
except ImportError:
    print("Error: weasyprint not installed. Run: pip install weasyprint")
    print("On macOS, also run: brew install pango cairo libffi")
    sys.exit(1)


def load_json_data(json_path: Path) -> dict:
    """Load CV data from JSON file."""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def render_template(template_dir: Path, template_name: str, data: dict) -> str:
    """Render Jinja2 template with data."""
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template(template_name)
    return template.render(**data)


def generate_pdf(html_content: str, output_path: Path, base_url: str = None):
    """Convert HTML to PDF using WeasyPrint."""
    html = HTML(string=html_content, base_url=base_url)

    # Additional CSS for PDF rendering with proper fonts
    extra_css = CSS(string="""
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Source+Sans+3:wght@300;400;500;600&display=swap');
    """)

    html.write_pdf(output_path, stylesheets=[extra_css])
    print(f"PDF generated: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description='Generate a professional CV PDF from JSON data and HTML template',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_cv.py
  python generate_cv.py --data cv_data.json --output stefan_kulk_cv.pdf
  python generate_cv.py --html  # Also output intermediate HTML
        """
    )

    # Get the script's directory as default base
    script_dir = Path(__file__).parent.resolve()

    parser.add_argument(
        '--data', '-d',
        type=Path,
        default=script_dir / 'cv_data.json',
        help='Path to JSON data file (default: cv_data.json)'
    )
    parser.add_argument(
        '--template', '-t',
        type=Path,
        default=script_dir / 'templates' / 'cv_template.html',
        help='Path to HTML template (default: templates/cv_template.html)'
    )
    parser.add_argument(
        '--output', '-o',
        type=Path,
        default=None,
        help='Output PDF filename (default: cv_<name>.pdf)'
    )
    parser.add_argument(
        '--html',
        action='store_true',
        help='Also output the rendered HTML file'
    )

    args = parser.parse_args()

    # Validate inputs
    if not args.data.exists():
        print(f"Error: Data file not found: {args.data}")
        sys.exit(1)

    if not args.template.exists():
        print(f"Error: Template file not found: {args.template}")
        sys.exit(1)

    # Load data
    print(f"Loading data from: {args.data}")
    data = load_json_data(args.data)

    # Render template
    print(f"Rendering template: {args.template}")
    template_dir = args.template.parent
    template_name = args.template.name
    html_content = render_template(template_dir, template_name, data)

    # Determine output filename
    if args.output:
        output_path = args.output
    else:
        name = data.get('personal', {}).get('name', 'cv').lower().replace(' ', '_')
        output_path = script_dir / f'cv_{name}.pdf'

    # Optionally save HTML
    if args.html:
        html_path = output_path.with_suffix('.html')
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"HTML generated: {html_path}")

    # Generate PDF
    generate_pdf(html_content, output_path, base_url=str(script_dir))

    print("\nDone!")


if __name__ == '__main__':
    main()
