window.onload = function() {
    document.getElementById('initiate-oauth-button')?.addEventListener('click', () => {
        fetch("http://localhost:42069/initiate", {method: "PUT"})
            .then(res => res.json).then(data => console.log(data));
    });
}
