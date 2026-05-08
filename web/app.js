function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('scroll', function() {
    if (window.scrollY > 500) {
        document.querySelector('button').style.display = 'block';
    } else {
        document.querySelector('button').style.display = 'none';
    }
});

document.querySelector('button').addEventListener('click', scrollToTop);
