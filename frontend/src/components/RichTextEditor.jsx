import React, { useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const RichTextEditor = ({ value, onChange, placeholder = 'Enter text...', style = {} }) => {
  const quillRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // Toolbar configuration with requested features
  const modules = {
    toolbar: [
      [{ 'size': ['small', false, 'large', 'huge'] }],  // Font size
      ['bold', 'italic', 'underline'],                   // Text formatting
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],     // Lists
      [{ 'align': [] }],                                 // Text alignment
      [{ 'color': [] }, { 'background': [] }],          // Colors
      ['link', 'image'],                                 // Links and Images
      ['clean']                                          // Remove formatting
    ]
  };

  const formats = [
    'size',
    'bold', 'italic', 'underline',
    'list',
    'align',
    'color', 'background',
    'link', 'image'
  ];

  // Handle image selection and resizing
  React.useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const editorDiv = editor.root;

    const handleClick = (e) => {
      if (e.target.tagName === 'IMG') {
        setSelectedImage(e.target);
      } else {
        setSelectedImage(null);
      }
    };

    editorDiv.addEventListener('click', handleClick);

    return () => {
      editorDiv.removeEventListener('click', handleClick);
    };
  }, []);

  // Apply width to selected image
  const resizeImage = (percentage) => {
    if (!selectedImage) return;
    
    // Calculate width based on percentage of container
    const containerWidth = quillRef.current?.getEditor().root.offsetWidth || 600;
    const newWidth = Math.round((containerWidth * percentage) / 100);
    
    selectedImage.style.width = `${newWidth}px`;
    selectedImage.style.height = 'auto';
  };

  return (
    <div style={{ ...style }}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ backgroundColor: 'white' }}
      />
      
      {/* Image size preset buttons */}
      {selectedImage && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
            Image Width:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => resizeImage(25)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#e8e8e8';
                e.target.style.borderColor = '#999';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#fff';
                e.target.style.borderColor = '#ccc';
              }}
            >
              25%
            </button>
            <button
              type="button"
              onClick={() => resizeImage(50)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#e8e8e8';
                e.target.style.borderColor = '#999';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#fff';
                e.target.style.borderColor = '#ccc';
              }}
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => resizeImage(75)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#e8e8e8';
                e.target.style.borderColor = '#999';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#fff';
                e.target.style.borderColor = '#ccc';
              }}
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => resizeImage(100)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#e8e8e8';
                e.target.style.borderColor = '#999';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#fff';
                e.target.style.borderColor = '#ccc';
              }}
            >
              100%
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
