import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RichTextEditor from '../RichTextEditor';

// Mock react-quill-new to avoid loading CSS and complex setup
jest.mock('react-quill-new', () => {
  return function MockedQuill({ value, onChange, placeholder }) {
    return (
      <div data-testid="quill-editor">
        <textarea
          data-testid="quill-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    );
  };
});

describe('RichTextEditor Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Basic Props', () => {
    it('should render the editor component', () => {
      render(
        <RichTextEditor
          value="Test content"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('quill-editor')).toBeInTheDocument();
    });

    it('should pass placeholder prop to Quill', () => {
      const customPlaceholder = 'Enter your text here...';
      render(
        <RichTextEditor
          value=""
          onChange={mockOnChange}
          placeholder={customPlaceholder}
        />
      );

      expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument();
    });

    it('should use default placeholder when not provided', () => {
      render(
        <RichTextEditor
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });

    it('should apply custom style prop', () => {
      const customStyle = { backgroundColor: '#f0f0f0', padding: '10px' };
      const { container } = render(
        <RichTextEditor
          value=""
          onChange={mockOnChange}
          style={customStyle}
        />
      );

      const editorWrapper = container.firstChild;
      expect(editorWrapper).toHaveStyle('background-color: rgb(240, 240, 240)');
      expect(editorWrapper).toHaveStyle('padding: 10px');
    });
  });

  describe('Content and onChange callback', () => {
    it('should call onChange when content is updated', () => {
      render(
        <RichTextEditor
          value="Initial content"
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByTestId('quill-textarea');
      fireEvent.change(textarea, { target: { value: 'Updated content' } });

      // onChange should be called with the new value
      expect(mockOnChange).toHaveBeenCalledWith('Updated content');
    });

    it('should display initial value', () => {
      const initialContent = '<p>Initial paragraph</p>';
      render(
        <RichTextEditor
          value={initialContent}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('quill-textarea')).toHaveValue(initialContent);
    });

    it('should handle empty content', () => {
      render(
        <RichTextEditor
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('quill-textarea')).toHaveValue('');
    });

    it('should handle HTML content with formatting', () => {
      const htmlContent = '<h1>Title</h1><p>Paragraph with <b>bold</b> and <i>italic</i> text</p>';
      render(
        <RichTextEditor
          value={htmlContent}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('quill-textarea')).toHaveValue(htmlContent);
    });

    it('should handle HTML content with images', () => {
      const htmlContentWithImage = '<p>Text</p><img src="test.jpg" />';
      render(
        <RichTextEditor
          value={htmlContentWithImage}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('quill-textarea')).toHaveValue(htmlContentWithImage);
    });

    it('should handle HTML content with lists', () => {
      const htmlContentWithLists = '<ol><li>Item 1</li><li>Item 2</li></ol><ul><li>Bullet 1</li></ul>';
      render(
        <RichTextEditor
          value={htmlContentWithLists}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('quill-textarea')).toHaveValue(htmlContentWithLists);
    });
  });

  describe('Component Lifecycle', () => {
    it('should handle prop updates', () => {
      const { rerender } = render(
        <RichTextEditor
          value="Initial"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('quill-textarea')).toHaveValue('Initial');

      rerender(
        <RichTextEditor
          value="Updated"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('quill-textarea')).toHaveValue('Updated');
    });

    it('should handle onChange callback changes', () => {
      const initialCallback = jest.fn();
      const { rerender } = render(
        <RichTextEditor
          value=""
          onChange={initialCallback}
        />
      );

      const textarea = screen.getByTestId('quill-textarea');
      fireEvent.change(textarea, { target: { value: 'test' } });

      expect(initialCallback).toHaveBeenCalledWith('test');

      const newCallback = jest.fn();
      rerender(
        <RichTextEditor
          value="test"
          onChange={newCallback}
        />
      );

      fireEvent.change(textarea, { target: { value: 'new test' } });
      expect(newCallback).toHaveBeenCalledWith('new test');
    });
  });
});

