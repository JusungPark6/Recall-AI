const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    // Handle the response
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}; 