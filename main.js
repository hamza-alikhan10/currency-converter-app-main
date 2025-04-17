// Wait for DOM to be fully loaded before executing code
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded");
    
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    // Check if user has previously set a theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    }
    
    themeToggle.addEventListener('click', () => {
        console.log("Theme toggle clicked");
        body.classList.toggle('dark-mode');
        
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeToggle.textContent = '☀️';
        } else {
            localStorage.setItem('theme', 'light');
            themeToggle.textContent = '🌙';
        }
    });
    
    // Currency converter functionality
    const API_KEY = "cur_live_3G1ky7g9pgdAsbhyktOlcgJzqaO7Em7eH0zjsxXF";
    const API_BASE = "https://api.currencyapi.com/v3/latest";
    
    // DOM Elements
    const converterForm = document.getElementById('converterForm');
    const quantityInput = document.getElementById('quantity');
    const currencySelect = document.getElementById('currency');
    const convertBtn = document.getElementById('convertBtn');
    const swapBtn = document.getElementById('swapBtn');
    const searchInput = document.getElementById('searchCurrency');
    const resultsTable = document.getElementById('resultsTable');
    const outputSection = document.getElementById('outputSection');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');
    const quickCurrencies = document.getElementById('quickCurrencies');
    
    // State variables
    let currentResults = [];
    let favoriteCurrencies = JSON.parse(localStorage.getItem('favoritesCurrencies') || '["USD", "EUR", "GBP", "JPY", "INR"]');
    let targetCurrency = 'EUR'; // Default target currency for swap feature
    
    // Initialize quick convert currencies
    function initQuickCurrencies() {
        const popularCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'INR'];
        quickCurrencies.innerHTML = '';
        
        popularCurrencies.forEach(currency => {
            const badge = document.createElement('div');
            badge.className = 'currency-badge';
            badge.textContent = currency;
            badge.addEventListener('click', () => {
                console.log("Quick currency clicked:", currency);
                currencySelect.value = currency;
                fetchCurrencyData(parseFloat(quantityInput.value) || 1, currency);
            });
            quickCurrencies.appendChild(badge);
        });
    }
    
    // Load saved preferences
    function loadSavedPreferences() {
        const lastBaseCurrency = localStorage.getItem('lastBaseCurrency');
        const lastAmount = localStorage.getItem('lastAmount');
        
        if (lastBaseCurrency && currencySelect.querySelector(`option[value="${lastBaseCurrency}"]`)) {
            currencySelect.value = lastBaseCurrency;
        }
        
        if (lastAmount) {
            quantityInput.value = lastAmount;
        }
    }
    
    // Format currency function
    function formatCurrency(value, currencyCode) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }
    
    // Fetch and display currency data
    async function fetchCurrencyData(amount, baseCurrency) {
        console.log("Fetching data:", amount, baseCurrency);
        
        // Validate inputs
        if (!amount || isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount greater than 0');
            return;
        }
        
        // Save preferences
        localStorage.setItem('lastBaseCurrency', baseCurrency);
        localStorage.setItem('lastAmount', amount);
        
        // Show loader, hide error
        loader.style.display = 'block';
        errorMessage.style.display = 'none';
        outputSection.style.display = 'none';
        
        try {
            const url = `${API_BASE}?apikey=${API_KEY}&base_currency=${baseCurrency}`;
            console.log("API URL (without sensitive API key):", API_BASE + "?apikey=[HIDDEN]&base_currency=" + baseCurrency);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(`API Error: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }
            
            const data = await response.json();
            console.log("API Response:", data);
            
            currentResults = [];
            
            // Process and display results
            for (let key in data.data) {
                const currencyData = data.data[key];
                const convertedValue = currencyData.value * amount;
                
                currentResults.push({
                    name: key,
                    code: key, // Using key as code since the API structure may vary
                    value: convertedValue,
                    isFavorite: favoriteCurrencies.includes(key)
                });
            }
            
            displayResults();
            outputSection.style.display = 'block';
        }
        catch (error) {
            console.error('Error fetching currency data:', error);
            errorMessage.textContent = `Unable to fetch currency rates: ${error.message}`;
            errorMessage.style.display = 'block';
        }
        finally {
            loader.style.display = 'none';
        }
    }
    
    // Display results in table
    function displayResults(filterText = '') {
        let filteredResults = currentResults;
        
        // Apply filter if provided
        if (filterText) {
            filterText = filterText.toLowerCase();
            filteredResults = currentResults.filter(currency => 
                currency.name.toLowerCase().includes(filterText) ||
                currency.code.toLowerCase().includes(filterText)
            );
        }
        
        // Sort results: favorites first, then alphabetically
        filteredResults = filteredResults.sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return a.code.localeCompare(b.code);
        });
        
        // Generate HTML
        let tableHTML = '';
        filteredResults.forEach(currency => {
            const starClass = currency.isFavorite ? 'active' : '';
            
            tableHTML += `
                <tr>
                    <td>
                        <span class="star-icon ${starClass}" data-currency="${currency.code}">
                            ${currency.isFavorite ? '★' : '☆'}
                        </span>
                    </td>
                    <td>${currency.name}</td>
                    <td>${currency.code}</td>
                    <td>${formatCurrency(currency.value, currency.code)}</td>
                </tr>
            `;
        });
        
        resultsTable.innerHTML = tableHTML;
        
        // Add event listeners to star icons
        document.querySelectorAll('.star-icon').forEach(star => {
            star.addEventListener('click', (e) => {
                const currencyCode = e.target.dataset.currency;
                toggleFavorite(currencyCode);
            });
        });
    }
    
    // Toggle favorite currency
    function toggleFavorite(currencyCode) {
        const index = favoriteCurrencies.indexOf(currencyCode);
        
        if (index === -1) {
            favoriteCurrencies.push(currencyCode);
        } else {
            favoriteCurrencies.splice(index, 1);
        }
        
        // Update UI
        currentResults.forEach(currency => {
            if (currency.code === currencyCode) {
                currency.isFavorite = !currency.isFavorite;
            }
        });
        
        displayResults(searchInput.value);
        
        // Save to local storage
        localStorage.setItem('favoritesCurrencies', JSON.stringify(favoriteCurrencies));
    }
    
    // Swap functionality
    function swapCurrencies() {
        console.log("Swap button clicked");
        const currentBase = currencySelect.value;
        
        // Find first non-base favorite or use EUR
        if (currentResults.length > 0) {
            const nonBaseFavorite = currentResults.find(c => c.code !== currentBase && c.isFavorite);
            if (nonBaseFavorite) {
                targetCurrency = nonBaseFavorite.code;
            }
        }
        
        // Swap the currencies
        currencySelect.value = targetCurrency;
        targetCurrency = currentBase;
        
        // Trigger conversion
        fetchCurrencyData(parseFloat(quantityInput.value) || 1, currencySelect.value);
    }
    
    // Event Listeners - Simplified to avoid conflicts
    converterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log("Form submitted");
        const amount = parseFloat(quantityInput.value);
        const currency = currencySelect.value;
        fetchCurrencyData(amount, currency);
    });
    
    // We don't need a separate event for the convert button since it's part of the form
    
    swapBtn.addEventListener('click', (e) => {
        e.preventDefault();
        swapCurrencies();
    });
    
    searchInput.addEventListener('input', (e) => {
        displayResults(e.target.value);
    });
    
    // Initialize the app
    initQuickCurrencies();
    loadSavedPreferences();
    
    // Auto-convert with initial values - delay to ensure everything's loaded
    setTimeout(() => {
        const amount = parseFloat(quantityInput.value) || 1;
        const currency = currencySelect.value;
        fetchCurrencyData(amount, currency);
    }, 500);
});