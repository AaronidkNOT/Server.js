
document.addEventListener('DOMContentLoaded', async () => {
    const logoutBtn = document.getElementById('logout-btn');
    const productsContainer = document.getElementById('products-container');
    const userNameSpan = document.getElementById('user-name');
    const formSelector = document.getElementById('form-selector');
    const notificationContainer = document.getElementById('notification-container');
    const forms = {
        general: document.getElementById('form-general'),
        ropa: document.getElementById('form-ropa'),
        electronica: document.getElementById('form-electronica'),
        libros: document.getElementById('form-libros'),
        cine: document.getElementById('form-cine')
    };
    
    const searchInput = document.getElementById('search-input');
    const filterTiendaSelect = document.getElementById('filter-tienda');
    const sortBySelect = document.getElementById('sort-by');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfoSpan = document.getElementById('page-info');

    const editProductModal = document.getElementById('edit-product-modal');
    const closeBtn = editProductModal.querySelector('.close-btn');
    const editProductForm = document.getElementById('edit-product-form');
    const editSpecificFields = document.getElementById('edit-specific-fields');
    const currentImagesContainer = document.getElementById('current-images-container');
    const editImagesInput = document.getElementById('edit-product-images');
    const editPreviewContainer = document.getElementById('edit-preview-images-container');
    const editFileNameDisplay = document.getElementById('edit-file-name-display');
    
    let productosOriginales = [];
    let productosFiltrados = [];
    let productosPorPagina = 6;
    let paginaActual = 1;

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/iniciar_sesion.html';
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userNameSpan.textContent = `Bienvenido, ${payload.username}`;

        // Lógica específica para el usuario 'cine'
        if (payload.username === 'cine') {
            const storeSelector = document.querySelector('.store-selector');
            if (storeSelector) {
                storeSelector.style.display = 'none';
            }

            Object.values(forms).forEach(form => {
                form.style.display = 'none';
                form.classList.remove('active', 'show');
            });

            const cineForm = forms['cine'];
            if (cineForm) {
                cineForm.style.display = 'flex';
                cineForm.classList.add('active');
                setTimeout(() => cineForm.classList.add('show'), 20);
            }
        } else if (payload.username === 'juegos') {
            const unwantedOptions = ['ropa', 'libros', 'cine'];
            Array.from(formSelector.options).forEach(option => {
                if (unwantedOptions.includes(option.value)) {
                    option.remove();
                }
            });

            formSelector.addEventListener('change', (e) => {
                const selectedForm = e.target.value;
                Object.values(forms).forEach(form => {
                    if (form.classList.contains('show')) {
                        form.classList.remove('show');
                        setTimeout(() => form.style.display = 'none', 250);
                    }
                });
                const formToShow = forms[selectedForm];
                formToShow.style.display = 'flex';
                setTimeout(() => formToShow.classList.add('show'), 20);
            });

            const defaultForm = document.querySelector('#form-general');
            defaultForm.style.display = 'flex';
            defaultForm.classList.add('show');
        } else {
            formSelector.addEventListener('change', (e) => {
                const selectedForm = e.target.value;
                Object.values(forms).forEach(form => {
                    if (form.classList.contains('show')) {
                        form.classList.remove('show');
                        setTimeout(() => {
                            form.style.display = 'none';
                        }, 250);
                    }
                });
                const formToShow = forms[selectedForm];
                formToShow.style.display = 'flex';
                setTimeout(() => {
                    formToShow.classList.add('show');
                }, 20);
                if (selectedForm === 'ropa') {
                    setupTallaStockInputs('tallas-stock-container', ['XS', 'S', 'M', 'L', 'XL', 'XXL']);
                }
            });

            const defaultForm = document.querySelector('#form-general');
            defaultForm.style.display = 'flex';
            defaultForm.classList.add('show');
        }
    } catch (e) {
        console.error("Error al decodificar el token:", e);
        localStorage.removeItem('token');
        window.location.href = '/iniciar_sesion.html';
        return;
    }

    const showNotification = (message, type = 'success') => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notificationContainer.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('hide');
            notification.addEventListener('transitionend', () => {
                notification.remove();
            });
        }, 5000);
    };

    const setupImagePreview = (inputElement, previewContainer, fileNameDisplay) => {
        let fileStore = new DataTransfer();

        const renderPreviews = () => {
            previewContainer.innerHTML = '';
            fileNameDisplay.textContent = fileStore.files.length > 0 ? `${fileStore.files.length} imagen(es) seleccionada(s)` : 'Seleccionar imágenes (múltiples)';
            
            if (fileStore.files.length > 0) {
                previewContainer.style.display = 'flex';
                Array.from(fileStore.files).forEach((file, index) => {
                    const previewWrapper = document.createElement('div');
                    previewWrapper.className = 'image-preview-wrapper';

                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(file);
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-image-btn';
                    removeBtn.textContent = '×';
                    removeBtn.type = 'button';
                    removeBtn.onclick = () => {
                        const newFiles = new DataTransfer();
                        Array.from(fileStore.files).forEach((f, i) => {
                            if (i !== index) newFiles.items.add(f);
                        });
                        fileStore = newFiles;
                        inputElement.files = fileStore.files;
                        renderPreviews();
                    };

                    previewWrapper.appendChild(img);
                    previewWrapper.appendChild(removeBtn);
                    previewContainer.appendChild(previewWrapper);
                });
            } else {
                previewContainer.style.display = 'none';
            }
        };

        inputElement.addEventListener('change', () => {
            const newFiles = Array.from(inputElement.files);
            fileStore = new DataTransfer();
            newFiles.forEach(file => fileStore.items.add(file));
            inputElement.files = fileStore.files;
            renderPreviews();
        });
        
        inputElement.form.addEventListener('reset', () => {
            fileStore = new DataTransfer();
            inputElement.files = fileStore.files;
            renderPreviews();
        });
    };

    const setupImageCarousel = (productItem) => {
        const imageContainer = productItem.querySelector('.product-image-container');
        if (!imageContainer) return;

        const images = Array.from(imageContainer.querySelectorAll('img'));
        const prevBtn = imageContainer.querySelector('.prev');
        const nextBtn = imageContainer.querySelector('.next');
        const dots = Array.from(imageContainer.querySelectorAll('.image-dot'));
        let currentImageIndex = 0;
        
        const updateCarousel = () => {
            const imageToShow = images[currentImageIndex];
            
            if (imageToShow.dataset.src) {
                imageToShow.src = imageToShow.dataset.src;
                delete imageToShow.dataset.src;
            }

            images.forEach(img => img.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            imageToShow.classList.add('active');
            if (dots.length > 0) {
                dots[currentImageIndex].classList.add('active');
            }
        };

        if (images.length > 0) updateCarousel();
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
                updateCarousel();
            });
        }
        
        if (nextBtn) {
            nextImageIndex = (currentImageIndex + 1) % images.length;
            updateCarousel();
        }

        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                currentImageIndex = parseInt(e.target.dataset.index);
                updateCarousel();
            });
        });
    };
    
    const renderProducts = (productos) => {
        productsContainer.innerHTML = '';

        if (productos.length === 0) {
            productsContainer.innerHTML = '<p>No hay productos que coincidan con la búsqueda.</p>';
            return;
        }

        const inicio = (paginaActual - 1) * productosPorPagina;
        const fin = inicio + productosPorPagina;
        const productosEnPagina = productos.slice(inicio, fin);
        const totalPaginas = Math.ceil(productos.length / productosPorPagina);

        productosEnPagina.forEach(producto => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item';

            const imageCarouselHTML = producto.imagenes && producto.imagenes.length > 0
                ? `
                <div class="product-image-container">
                    ${producto.imagenes.map((img, index) => `
                        <img 
                            ${index === 0 ? `src="https://server-js-beta.vercel.app/uploads/${img}"` : `data-src="https://server-js-beta.vercel.app/uploads/${img}"`}
                            alt="${producto.nombre || producto.titulo}" 
                            class="${index === 0 ? 'active' : ''}" 
                            loading="lazy"
                            data-index="${index}">
                    `).join('')}
                    ${producto.imagenes.length > 1 ? `
                        <button class="image-nav-btn prev"><i class="fas fa-chevron-left"></i></button>
                        <button class="image-nav-btn next"><i class="fas fa-chevron-right"></i></button>
                        <div class="image-dots-container">
                            ${producto.imagenes.map((_, index) => `<div class="image-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`).join('')}
                        </div>
                    ` : ''}
                </div>
                `
                : '<div class="product-image-container no-image"><p>Sin imagen</p></div>';

            const getProductDetails = (p) => {
                let details = '';
                switch (p.tipo) {
                    case 'ropa':
                        const tallasYStock = p.tallas.map(talla => `${talla}: ${p.stockPorTalla[talla] || 0}`).join(', ');
                        details += `<p><strong>Stock por talla:</strong> ${tallasYStock}</p>`;
                        details += `<p><strong>Color:</strong> ${p.color}</p>`;
                        details += p.material ? `<p><strong>Material:</strong> ${p.material}</p>` : '';
                        break;
                    case 'electronica':
                        details += `<p><strong>Stock:</strong> ${p.stock}</p>`;
                        details += `<p><strong>Marca:</strong> ${p.marca}</p>`;
                        details += `<p><strong>Modelo:</strong> ${p.modelo}</p>`;
                        details += p.especificaciones_tecnicas ? `<p><strong>Especificaciones:</strong> ${p.especificaciones_tecnicas}</p>` : '';
                        break;
                    case 'libros':
                        details += `<p><strong>Stock:</strong> ${p.stock}</p>`;
                        details += `<p><strong>Autor:</strong> ${p.autor}</p>`;
                        details += p.editorial ? `<p><strong>Editorial:</strong> ${p.editorial}</p>` : '';
                        details += p.isbn ? `<p><strong>ISBN:</strong> ${p.isbn}</p>` : '';
                        details += p.genero ? `<p><strong>Género:</strong> ${p.genero}</p>` : '';
                        break;
                    case 'cine':
                        details += `<p><strong>Stock:</strong> ${p.stock}</p>`;
                        details += p.duracion ? `<p><strong>Duración:</strong> ${p.duracion}</p>` : '';
                        details += p.genero ? `<p><strong>Género:</strong> ${p.genero}</p>` : '';
                        details += p.clasificacionEdad ? `<p><strong>Clasificación:</strong> ${p.clasificacionEdad}</p>` : '';
                        break;
                    default: // general
                        details += `<p><strong>Stock:</strong> ${p.stock}</p>`;
                        details += p.sku ? `<p><strong>SKU:</strong> ${p.sku}</p>` : '';
                        details += p.categoria ? `<p><strong>Categoría:</strong> ${p.categoria}</p>` : '';
                        details += p.peso ? `<p><strong>Peso:</strong> ${p.peso} kg</p>` : '';
                        details += p.estado ? `<p><strong>Estado:</strong> <span class="status-${p.estado}">${p.estado}</span></p>` : '';
                        break;
                }
                return details;
            };

            const title = producto.nombre || producto.titulo;

            productItem.innerHTML = `
                ${imageCarouselHTML}
                <div class="product-info">
                    <h3>${title}</h3>
                    <p>${producto.descripcion}</p>
                    <p><strong>Precio:</strong> ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(producto.precio)}</p>
                    ${getProductDetails(producto)}
                </div>
                <div class="product-actions">
                    <button class="edit-btn" data-id="${producto._id}" data-type="${producto.tipo}">Editar</button>
                    <button class="delete-btn" data-id="${producto._id}">Eliminar</button>
                </div>
            `;
            productsContainer.appendChild(productItem);
            
            setupImageCarousel(productItem);
        });

        prevPageBtn.disabled = paginaActual === 1;
        nextPageBtn.disabled = paginaActual === totalPaginas;
        pageInfoSpan.textContent = `Página ${totalPaginas === 0 ? 0 : paginaActual} de ${totalPaginas}`;

        productsContainer.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const productId = btn.getAttribute('data-id');
                if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                    try {
                        const response = await fetch(`https://server-js-beta.vercel.app/api/productos/${productId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        if (response.ok) {
                            showNotification('Producto eliminado exitosamente.');
                            fetchProducts();
                        } else {
                            const error = await response.json();
                            showNotification('Error al eliminar: ' + error.mensaje, 'error');
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        showNotification('Error de conexión al eliminar.', 'error');
                    }
                }
            });
        });

        productsContainer.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = btn.getAttribute('data-id');
                const productType = btn.getAttribute('data-type') || 'general';
                const producto = productosOriginales.find(p => p._id === productId);

                console.log("Producto a editar:", producto); // DEBUG
                if (producto) {
                    document.getElementById('edit-product-id').value = producto._id;
                    document.getElementById('edit-product-type').value = productType;
                    
                    // Nombre o Título
                if (productType === 'libros' || productType === 'cine') {
                    document.getElementById('edit-product-name').value = producto.titulo ?? '';
                } else {
                    document.getElementById('edit-product-name').value = producto.nombre ?? '';
                }

                // Descripción
                const descTextarea = document.getElementById('edit-product-description');
                descTextarea.value = producto.descripcion ?? '';
                updateCharCounter(descTextarea, document.getElementById('edit-product-description-counter'));

                // Precio
                document.getElementById('edit-product-price').value = 
                (producto.precio !== undefined && producto.precio !== null) ? producto.precio : '';

                    
                    currentImagesContainer.innerHTML = '';
                    if (producto.imagenes && producto.imagenes.length > 0) {
                        producto.imagenes.forEach(imgName => {
                            const img = document.createElement('img');
                            img.src = `https://server-js-beta.vercel.app/uploads/${imgName}`;
                            currentImagesContainer.appendChild(img);
                        });
                    } else {
                        currentImagesContainer.innerHTML = '<p>No hay imágenes subidas.</p>';
                    }
                    // Solo limpiar las imágenes, no resetear todo el formulario
                    editImagesInput.value = '';
                    editPreviewContainer.innerHTML = '';
                    editFileNameDisplay.textContent = 'Seleccionar imágenes (múltiples)';
                    Array.from(editSpecificFields.children).forEach(child => child.style.display = 'none');
                    
                    const fieldsToShow = document.getElementById(`edit-fields-${productType}`);
                    if (fieldsToShow) {
                        fieldsToShow.style.display = 'block';
                    }

                    switch(productType) {
                        case 'ropa':
                            document.getElementById('edit-ropa-color').value = producto.color || '';
                            document.getElementById('edit-ropa-material').value = producto.material || '';
                            const tallasStockContainer = document.getElementById('edit-tallas-stock-container');
                            tallasStockContainer.innerHTML = '';
                            ['XS', 'S', 'M', 'L', 'XL', 'XXL'].forEach(talla => {
                                const stock = producto.stockPorTalla ? (producto.stockPorTalla[talla] || 0) : 0;
                                tallasStockContainer.innerHTML += `
                                    <div class="talla-stock-input">
                                        <label for="edit-stock-${talla}">${talla}:</label>
                                        <input type="number" id="edit-stock-${talla}" value="${stock}" min="0">
                                    </div>
                                `;
                            });
                            break;
                        case 'electronica':
                            document.getElementById('edit-electronica-brand').value = producto.marca || '';
                            document.getElementById('edit-electronica-model').value = producto.modelo || '';
                            document.getElementById('edit-electronica-specs').value = producto.especificaciones_tecnicas || '';
                            document.getElementById('edit-electronica-stock').value = producto.stock;
                            break;
                        case 'libros':
                            document.getElementById('edit-libro-stock').value = producto.stock;
                            document.getElementById('edit-libro-author').value = producto.autor || '';
                            document.getElementById('edit-libro-publisher').value = producto.editorial || '';
                            document.getElementById('edit-libro-isbn').value = producto.isbn || '';
                            document.getElementById('edit-libro-genre').value = producto.genero || '';
                            break;
                        case 'cine':
                            document.getElementById('edit-cine-stock').value = producto.stock;
                            document.getElementById('edit-cine-duration').value = producto.duracion || '';
                            document.getElementById('edit-cine-genre').value = producto.genero || '';
                            document.getElementById('edit-cine-trailer').value = producto.trailer || '';
                            document.getElementById('edit-cine-clasificacion').value = producto.clasificacionEdad || 'ATP';
                        if (producto.fechaFuncion) {
                            document.getElementById('edit-cine-fecha').value = producto.fechaFuncion.slice(0, 16);
                            }
                            break;
                        case 'general':
                            document.getElementById('edit-product-stock').value = producto.stock;
                            document.getElementById('edit-product-sku').value = producto.sku || '';
                            document.getElementById('edit-product-category').value = producto.categoria || '';
                            document.getElementById('edit-product-weight').value = producto.peso || '';
                            document.getElementById('edit-product-status').value = producto.estado || 'activo';
                            break;
                    }

                    editProductModal.style.display = 'flex';
                }
            });
        });
    };

    const fetchProducts = async () => {
        productsContainer.innerHTML = '<p id="loading-message">Cargando productos...</p>';
        try {
            const response = await fetch('https://server-js-beta.vercel.app/api/productos', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const productos = await response.json();
                productosOriginales = productos;
                updateFiltersAndRender();
            } else {
                throw new Error('Error al obtener productos');
            }
        } catch (error) {
            console.error('Error:', error);
            productsContainer.innerHTML = `<p style="color: var(--error);">No se pudieron cargar los productos.</p>`;
        }
    };
    
    const updateFiltersAndRender = () => {
        const tiendasUnicas = [...new Set(productosOriginales.map(p => p.tipo))];
        filterTiendaSelect.innerHTML = '<option value="todos">Todos</option>';
        tiendasUnicas.forEach(tienda => {
            const option = document.createElement('option');
            option.value = tienda;
            option.textContent = tienda.charAt(0).toUpperCase() + tienda.slice(1);
            filterTiendaSelect.appendChild(option);
        });

        filterAndSortProducts();
    };

    const filterAndSortProducts = () => {
        let tempProducts = [...productosOriginales];
        const searchTerm = searchInput.value.toLowerCase();
        const selectedTienda = filterTiendaSelect.value;
        const sortBy = sortBySelect.value;

        tempProducts = tempProducts.filter(p => {
            const matchesSearch = (p.nombre && p.nombre.toLowerCase().includes(searchTerm)) ||
                                    (p.titulo && p.titulo.toLowerCase().includes(searchTerm)) ||
                                    (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm)) ||
                                    (p.categoria && p.categoria.toLowerCase().includes(searchTerm)) ||
                                    (p.sku && p.sku.toLowerCase().includes(searchTerm)) ||
                                    (p.autor && p.autor.toLowerCase().includes(searchTerm)) ||
                                    (p.genero && p.genero.toLowerCase().includes(searchTerm)) ||
                                    (p.marca && p.marca.toLowerCase().includes(searchTerm)) ||
                                    (p.modelo && p.modelo.toLowerCase().includes(searchTerm)) ||
                                    (p.tallas && p.tallas.some(t => t.toLowerCase().includes(searchTerm)));
            const matchesTienda = selectedTienda === 'todos' || p.tipo === selectedTienda;
            return matchesSearch && matchesTienda;
        });

        switch (sortBy) {
            case 'name-asc':
                tempProducts.sort((a, b) => (a.nombre || a.titulo).localeCompare(b.nombre || b.titulo));
                break;
            case 'name-desc':
                tempProducts.sort((a, b) => (b.nombre || b.titulo).localeCompare(a.nombre || b.titulo));
                break;
            case 'price-asc':
                tempProducts.sort((a, b) => a.precio - b.precio);
                break;
            case 'price-desc':
                tempProducts.sort((a, b) => b.precio - a.precio);
                break;
        }

        productosFiltrados = tempProducts;
        paginaActual = 1;
        renderProducts(productosFiltrados);
    };

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/iniciar_sesion.html';
    });

    const setupTallaStockInputs = (containerId, tallas, currentStock = {}) => {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        tallas.forEach(talla => {
            const stock = currentStock[talla] || 0;
            const div = document.createElement('div');
            div.className = 'talla-stock-input';
            div.innerHTML = `
                <label for="${containerId}-${talla}">${talla}:</label>
                <input type="number" id="${containerId}-${talla}" name="stock-talla-${talla}" value="${stock}" min="0">
            `;
            container.appendChild(div);
        });
    };
    
    // dashboard.js

// ... (código existente hasta la función setupFormSubmission)

const setupFormSubmission = (form) => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const formType = form.querySelector('input[name="tipo"]').value;

        if (formType === 'ropa') {
            const stockPorTalla = {};
            form.querySelectorAll('.talla-stock-input input').forEach(input => {
                const talla = input.id.split('-').pop();
                if (input.value > 0) {
                    stockPorTalla[talla] = parseInt(input.value);
                }
            });
            if (Object.keys(stockPorTalla).length === 0) {
                showNotification('Por favor, introduce el stock para al menos una talla.', 'error');
                return;
            }
            formData.append('stock_por_talla', JSON.stringify(stockPorTalla));
        }

        // --- INICIO DE LA CORRECCIÓN ---
        // Este bloque de código falta para el tipo 'cine'
        if (formType === 'cine') {
            const trailer = form.querySelector('#cine-trailer').value;
            const clasificacionEdad = form.querySelector('#cine-clasificacion').value;
            formData.append('trailer', trailer);
            formData.append('clasificacionEdad', clasificacionEdad);
        }
        // --- FIN DE LA CORRECCIÓN ---

        try {
            const response = await fetch('https://server-js-beta.vercel.app/api/productos', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                showNotification('Producto agregado exitosamente!');
                form.reset();
                fetchProducts();
            } else {
                const error = await response.json();
                showNotification('Error al agregar el producto: ' + error.mensaje, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error de conexión. No se pudo agregar el producto.', 'error');
        }
    });
};

    // Función para actualizar el contador de caracteres
    const updateCharCounter = (textarea, counterElement) => {
        const currentLength = textarea.value.length;
        const maxLength = 200;
        counterElement.textContent = `${currentLength}/${maxLength}`;
        if (currentLength > maxLength) {
            counterElement.style.color = 'red';
        } else {
            counterElement.style.color = 'inherit';
        }
    };

    // Configurar los contadores para los formularios de creación
    const setupFormCounter = (formId, textareaId, counterId) => {
        const form = document.getElementById(formId);
        const textarea = document.getElementById(textareaId);
        const counter = document.getElementById(counterId);
        if (textarea && counter) {
            textarea.addEventListener('input', () => updateCharCounter(textarea, counter));
            // También inicializar el contador al cargar
            updateCharCounter(textarea, counter);
            // Asegurarse de que el contador se reinicie al resetear el formulario
            form.addEventListener('reset', () => setTimeout(() => updateCharCounter(textarea, counter), 0));
        }
    };

    setupFormCounter('form-general', 'product-description', 'product-description-counter');
    setupFormCounter('form-ropa', 'ropa-description', 'ropa-description-counter');
    setupFormCounter('form-electronica', 'electronica-description', 'electronica-description-counter');
    setupFormCounter('form-libros', 'libro-description', 'libro-description-counter');
    setupFormCounter('form-cine', 'cine-description', 'cine-description-counter');


    Object.values(forms).forEach(setupFormSubmission);

    setupImagePreview(document.getElementById('product-images'), document.getElementById('preview-images-container'), document.getElementById('file-name-display'));
    setupImagePreview(document.getElementById('ropa-images'), document.getElementById('ropa-preview-images-container'), document.getElementById('ropa-file-name-display'));
    setupImagePreview(document.getElementById('electronica-images'), document.getElementById('electronica-preview-images-container'), document.getElementById('electronica-file-name-display'));
    setupImagePreview(document.getElementById('libro-images'), document.getElementById('libro-preview-images-container'), document.getElementById('libro-file-name-display'));
    setupImagePreview(document.getElementById('cine-images'), document.getElementById('cine-preview-images-container'), document.getElementById('cine-file-name-display'));
    setupImagePreview(editImagesInput, editPreviewContainer, editFileNameDisplay);
    
    fetchProducts();

    searchInput.addEventListener('input', filterAndSortProducts);
    filterTiendaSelect.addEventListener('change', filterAndSortProducts);
    sortBySelect.addEventListener('change', filterAndSortProducts);

    prevPageBtn.addEventListener('click', () => {
        if (paginaActual > 1) {
            paginaActual--;
            renderProducts(productosFiltrados);
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (paginaActual < Math.ceil(productosFiltrados.length / productosPorPagina)) {
            paginaActual++;
            renderProducts(productosFiltrados);
        }
    });

    closeBtn.addEventListener('click', () => {
        editProductModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === editProductModal) {
            editProductModal.style.display = 'none';
        }
    });

    editProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
    const productId = document.getElementById('edit-product-id').value;
    const productType = document.getElementById('edit-product-type').value;
    const formData = new FormData();

    formData.append('descripcion', document.getElementById('edit-product-description').value);
    formData.append('precio', document.getElementById('edit-product-price').value);
    formData.append('tipo', productType);

    const titleOrName = document.getElementById('edit-product-name').value;
    if (productType === 'libros' || productType === 'cine') {
        formData.append('titulo', titleOrName);
    } else {
        formData.append('nombre', titleOrName);
    }

        switch (productType) {
            case 'ropa':
                formData.append('color', document.getElementById('edit-ropa-color').value);
                formData.append('material', document.getElementById('edit-ropa-material').value);
                
                const stockPorTalla = {};
                document.querySelectorAll('#edit-tallas-stock-container input').forEach(input => {
                    const talla = input.id.split('-').pop();
                    stockPorTalla[talla] = parseInt(input.value) || 0;
                });
                formData.append('stock_por_talla', JSON.stringify(stockPorTalla));
                break;
            case 'electronica':
                formData.append('marca', document.getElementById('edit-electronica-brand').value);
                formData.append('modelo', document.getElementById('edit-electronica-model').value);
                formData.append('especificaciones_tecnicas', document.getElementById('edit-electronica-specs').value);
                formData.append('stock', document.getElementById('edit-electronica-stock').value);
                break;
            case 'libros':
                formData.append('stock', document.getElementById('edit-libro-stock').value);
                formData.append('autor', document.getElementById('edit-libro-author').value);
                formData.append('editorial', document.getElementById('edit-libro-publisher').value);
                formData.append('isbn', document.getElementById('edit-libro-isbn').value);
                formData.append('genero', document.getElementById('edit-libro-genre').value);
                break;
            case 'cine':
                formData.append('stock', document.getElementById('edit-cine-stock').value);
                formData.append('duracion', document.getElementById('edit-cine-duration').value);
                formData.append('genero', document.getElementById('edit-cine-genre').value);
                formData.append('fechaFuncion', document.getElementById('edit-cine-fecha').value); 
                formData.append('trailer', document.getElementById('edit-cine-trailer').value); 
                formData.append('clasificacionEdad', document.getElementById('edit-cine-clasificacion').value); 
                break;
            case 'general':
                formData.append('stock', document.getElementById('edit-product-stock').value);
                formData.append('sku', document.getElementById('edit-product-sku').value);
                formData.append('categoria', document.getElementById('edit-product-category').value);
                formData.append('peso', document.getElementById('edit-product-weight').value);
                formData.append('estado', document.getElementById('edit-product-status').value);
                break;
        }

        Array.from(editImagesInput.files).forEach(file => {
            formData.append('imagenes', file);
        });

        try {
            const response = await fetch(`https://server-js-beta.vercel.app/api/productos/${productId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
        showNotification('Producto actualizado exitosamente!');
        editProductModal.style.display = 'none';
        fetchProducts();
        } else {
        let errorMsg = 'Error desconocido';
        try {
        const error = await response.json();
        errorMsg = error.mensaje || JSON.stringify(error);
        } catch {
        errorMsg = await response.text();
        }
        showNotification('Error al actualizar el producto: ' + errorMsg, 'error');
        }

        } catch (error) {
            console.error('Error:', error);
            showNotification('Error de conexión al actualizar.', 'error');
        }
    });
});