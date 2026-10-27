/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Nunito', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
            colors: {
                // Cor da marca FABLE: terracota/coral, quente e criativa.
                marca: {
                    50: '#FFF4EF',
                    100: '#FFE6DB',
                    200: '#FFC8B2',
                    300: '#FBA383',
                    400: '#F27E55',
                    500: '#E4612F',
                    600: '#C94C1F',
                    700: '#A23C19',
                    800: '#7E3017',
                    900: '#5E2614',
                },
            },
        },
    },
    plugins: [],
}
