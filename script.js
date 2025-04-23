const toggleDark = document.getElementById('toggle-dark');
toggleDark.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});

// Photo Preview
document.getElementById('photoInput').addEventListener('change', function () {
  const preview = document.getElementById('photoPreview');
  preview.innerHTML = '';
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.createElement('img');
      img.src = e.target.result;
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
});

// Blog Posting
function postBlog() {
  const input = document.getElementById('blogInput');
  const post = document.createElement('div');
  post.className = 'blog-post';
  post.innerText = input.value;
  document.getElementById('blogPosts').prepend(post);
  input.value = '';
}

// PDF Upload or Drive Link
function uploadPDF() {
  const fileInput = document.getElementById('pdfInput');
  const driveInput = document.getElementById('driveLink');
  const display = document.getElementById('pdfDisplay');
  display.innerHTML = '';

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.innerText = `View PDF: ${file.name}`;
    link.target = '_blank';
    link.classList.add('pdf-link');
    display.appendChild(link);
  } else if (driveInput.value) {
    const link = document.createElement('a');
    link.href = driveInput.value;
    link.innerText = 'Open Google Drive File';
    link.target = '_blank';
    link.classList.add('pdf-link');
    display.appendChild(link);
  } else {
    alert('Please select a PDF or paste a Drive link.');
  }

  // Reset
  fileInput.value = '';
  driveInput.value = '';
}
