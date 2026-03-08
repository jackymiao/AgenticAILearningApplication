import React, { useRef, useState, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// Configuration for image optimization
const MAX_IMAGE_WIDTH = 1200; // Max width in pixels
const MAX_FILE_SIZE = 500 * 1024; // Max 500KB
const IMAGE_QUALITY = 0.85; // JPEG quality (0-1)

const RichTextEditor = ({ value, onChange, placeholder = 'Enter text...', style = {} }) => {
  const quillRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [resizeNotification, setResizeNotification] = useState(null);

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Resize image using Canvas API
  const resizeImageFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_IMAGE_WIDTH) {
            height = Math.round((height * MAX_IMAGE_WIDTH) / width);
            width = MAX_IMAGE_WIDTH;
          }
          
          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with compression
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({
                  blob,
                  originalSize: file.size,
                  newSize: blob.size,
                  originalDimensions: { width: img.width, height: img.height },
                  newDimensions: { width, height }
                });
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            IMAGE_QUALITY
          );
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Custom image handler
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      
      try {
        const editor = quillRef.current?.getEditor();
        if (!editor) return;
        
        // Check if image needs resizing
        const needsResize = file.size > MAX_FILE_SIZE;
        
        if (needsResize) {
          // Show processing message
          setResizeNotification({ type: 'processing', message: 'Optimizing image...' });
          
          // Resize the image
          const result = await resizeImageFile(file);
          
          // Show before/after notification
          setResizeNotification({
            type: 'success',
            message: `Image optimized: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.newSize)}`,
            originalSize: result.originalSize,
            newSize: result.newSize
          });
          
          // Convert blob to base64
          const reader = new FileReader();
          reader.onload = () => {
            const range = editor.getSelection(true);
            editor.insertEmbed(range.index, 'image', reader.result);
            editor.setSelection(range.index + 1);
          };
          reader.readAsDataURL(result.blob);
          
          // Hide notification after 5 seconds
          setTimeout(() => setResizeNotification(null), 5000);
        } else {
          // Image is small enough, insert directly
          const reader = new FileReader();
          reader.onload = () => {
            const range = editor.getSelection(true);
            editor.insertEmbed(range.index, 'image', reader.result);
            editor.setSelection(range.index + 1);
          };
          reader.readAsDataURL(file);
          
          // Show info that no resize was needed
          setResizeNotification({
            type: 'info',
            message: `Image added (${formatFileSize(file.size)}) - no optimization needed`
          });
          setTimeout(() => setResizeNotification(null), 3000);
        }
      } catch (error) {
        console.error('Image processing error:', error);
        setResizeNotification({
          type: 'error',
          message: 'Failed to process image. Please try a different image.'
        });
        setTimeout(() => setResizeNotification(null), 5000);
      }
    };
    
    input.click();
  };

  // Toolbar configuration with custom image handler
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'size': ['small', false, 'large', 'huge'] }],  // Font size
        ['bold', 'italic', 'underline'],                   // Text formatting
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],     // Lists
        [{ 'align': [] }],                                 // Text alignment
        [{ 'color': [] }, { 'background': [] }],          // Colors
        ['link', 'image'],                                 // Links and Images
        ['clean']                                          // Remove formatting
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), []);

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
      {/* Image resize notification */}
      {resizeNotification && (
        <div style={{
          marginBottom: '12px',
          padding: '12px 16px',
          backgroundColor: resizeNotification.type === 'success' ? '#e8f5e9' :
                          resizeNotification.type === 'error' ? '#ffebee' :
                          resizeNotification.type === 'processing' ? '#fff3e0' : '#e3f2fd',
          border: `1px solid ${resizeNotification.type === 'success' ? '#4caf50' :
                               resizeNotification.type === 'error' ? '#f44336' :
                               resizeNotification.type === 'processing' ? '#ff9800' : '#2196f3'}`,
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#333'
        }}>
          <span style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: resizeNotification.type === 'success' ? '#4caf50' :
                   resizeNotification.type === 'error' ? '#f44336' :
                   resizeNotification.type === 'processing' ? '#ff9800' : '#2196f3'
          }}>
            {resizeNotification.type === 'success' ? '✓' :
             resizeNotification.type === 'error' ? '✗' :
             resizeNotification.type === 'processing' ? '⟳' : 'ⓘ'}
          </span>
          <span>{resizeNotification.message}</span>
        </div>
      )}
      
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
