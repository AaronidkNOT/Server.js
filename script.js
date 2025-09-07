document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.querySelector('form');
    const mensajeDiv = document.getElementById('mensaje');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        mensajeDiv.textContent = '';
        mensajeDiv.style.color = '';

        const usuario = document.getElementById('usuario').value;
        const password = document.getElementById('password').value;
        const data = {
            usuario,
            password
        };

        try {
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (response.ok) {
                console.log('Inicio de sesión exitoso:', result.mensaje);
                mensajeDiv.textContent = result.mensaje;
                mensajeDiv.style.color = 'green';
                localStorage.setItem('token', result.token);
                window.location.href = '/dashboard.html'; 
            } else {
                console.error('Error en el inicio de sesión:', result.mensaje);
                mensajeDiv.textContent = 'Error: ' + result.mensaje;
                mensajeDiv.style.color = 'red';
            }

        } catch (error) {
            console.error('Error de red o del servidor:', error);
            mensajeDiv.textContent = 'Error: No se pudo conectar al servidor.';
            mensajeDiv.style.color = 'red';
        }
    });
});

    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const eyeOpen = document.getElementById('eyeOpen');
    const eyeClosed = document.getElementById('eyeClosed');

    togglePassword.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        eyeOpen.style.display = isPassword ? 'none' : 'inline';
        eyeClosed.style.display = isPassword ? 'inline' : 'none';
    });
