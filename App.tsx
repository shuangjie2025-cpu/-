

import React, { useState, useEffect, useRef } from 'react';
import type { Product, QuoteItem, QuoteSettings, DisplayConfig, Customer, AppState, Draft } from './types';
import { STEPS } from './constants';
import { Header } from './components/Header';
import { Stepper } from './components/Stepper';
import { ToggleSwitch } from './components/ToggleSwitch';
import { ProductItem } from './components/ProductItem';
import { Icon } from './components/Icon';

const DRAFTS_STORAGE_KEY = 'siemens-quote-drafts';
const PRODUCTS_STORAGE_KEY = 'siemens-quote-products';

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'WN14800CN',
    name: 'iQ700 洗衣机',
    model: 'WN14800CN',
    description: '自动去渍，智能除菌',
    image: 'https://picsum.photos/seed/washingmachine1/100/100',
    unitPrice: 5299,
    dimensions: '84.8 x 59.8 x 59.0 cm',
    powerConsumption: '0.92 kWh/cycle',
    energyEfficiency: '一级',
    origin: '中国',
    specialFeature: 'autoStain 自动去渍',
    warranty: '2年整机，10年电机',
    installationDiagram: 'https://picsum.photos/seed/diagram1/100/100',
  },
  {
    id: 'SN25M831TI',
    name: 'iQ500 洗碗机',
    model: 'SN25M831TI',
    description: '强力除菌，灵活碗篮',
    image: 'https://picsum.photos/seed/dishwasher/100/100',
    unitPrice: 4899,
    dimensions: '84.5 x 60.0 x 60.0 cm',
    powerConsumption: '0.83 kWh/cycle',
    energyEfficiency: '一级',
    origin: '德国',
    specialFeature: 'VarioFlex 灵动碗篮',
    warranty: '2年整机',
    installationDiagram: 'https://picsum.photos/seed/diagram2/100/100',
  },
];

const initialDisplayConfig: DisplayConfig = {
    productImage: true,
    dimensions: false,
    powerConsumption: true,
    energyEfficiency: true,
    origin: false,
    specialFeature: true,
    warranty: false,
    installationDiagram: false,
};

const initialQuoteDetails = { name: `报价单-${new Date().toISOString().slice(0, 10)}`, date: new Date().toLocaleDateString('zh-CN'), logo: '' };
const initialCustomer: Customer = { name: '', phone: '', address: '' };
const initialSalesInfo = { name: '', phone: '' };
const initialQuoteItems: QuoteItem[] = [];
const initialSettings: QuoteSettings = { discount: 5, includeVat: true, terms: '' };
const emptyProduct: Product = { id: '', name: '', model: '', description: '', image: '', unitPrice: 0, dimensions: '', powerConsumption: '', energyEfficiency: '', origin: '', specialFeature: '', warranty: '', installationDiagram: '' };

const displayConfigLabels: Record<keyof DisplayConfig, string> = {
    productImage: '产品图片',
    dimensions: '尺寸信息',
    powerConsumption: '额定功率',
    energyEfficiency: '能效等级',
    origin: '原产地',
    specialFeature: '特殊功能',
    warranty: '质保期',
    installationDiagram: '安装图',
};

// --- Reusable Components & Helpers ---
const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & {label: string, id: string }> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-2">{label}</label>
        <input id={id} {...props} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009999] focus:border-transparent" />
    </div>
);

const NavigationButtons: React.FC<{ onPrev?: () => void, onNext?: () => void, prevLabel?: string, nextLabel?: string, nextDisabled?: boolean }> = ({ onPrev, onNext, prevLabel, nextLabel, nextDisabled }) => (
    <div className="flex justify-between items-center mt-auto pt-6">
        {onPrev ? (
            <button onClick={onPrev} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">
                {prevLabel || '上一步'}
            </button>
        ) : <div></div>}
        {onNext && (
            <button onClick={onNext} disabled={nextDisabled} className="px-6 py-2 bg-[#007bff] text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                {nextLabel || '下一步'}
            </button>
        )}
    </div>
);

const Toast: React.FC<{ message: string; show: boolean; onDismiss: () => void }> = ({ message, show, onDismiss }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  return (
    <div className={`fixed bottom-8 right-8 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg transition-transform duration-300 z-50 ${show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
      {message}
    </div>
  );
};

const getEffectivePrice = (item: QuoteItem): number => item.quotePrice ?? item.unitPrice;

const calculateQuoteTotal = (items: QuoteItem[] | undefined, settings: QuoteSettings | undefined): number => {
    if (!items || !settings) return 0;
    const subtotal = items.reduce((acc, item) => {
        if (!item || typeof item.quantity !== 'number') return acc;
        return acc + getEffectivePrice(item) * item.quantity;
    }, 0);
    const discountAmount = subtotal * ((settings.discount || 0) / 100);
    const totalAfterDiscount = subtotal - discountAmount;
    const vatAmount = settings.includeVat ? totalAfterDiscount * 0.13 : 0;
    const grandTotal = totalAfterDiscount + vatAmount;
    return grandTotal;
};

// --- Main App Component ---
function App() {
  const [view, setView] = useState<'home' | 'quote' | 'productManagement'>('home');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  
  // App-wide Data State
  const [products, setProducts] = useState<Product[]>([]);

  // Quote State
  const [currentStep, setCurrentStep] = useState(1);
  const [quoteDetails, setQuoteDetails] = useState(initialQuoteDetails);
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [salesInfo, setSalesInfo] = useState(initialSalesInfo);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>(initialQuoteItems);
  const [settings, setSettings] = useState<QuoteSettings>(initialSettings);
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig>(initialDisplayConfig);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Product Management State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvMappings, setCsvMappings] = useState<Record<string, keyof Product | 'ignore'>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);


  // --- Effects for Data Persistence ---
  useEffect(() => {
    try {
      // Load and validate drafts
      const savedDraftsJSON = localStorage.getItem(DRAFTS_STORAGE_KEY);
      if (savedDraftsJSON) {
        const parsedDrafts: Partial<Draft>[] = JSON.parse(savedDraftsJSON);
        const validatedDrafts = parsedDrafts.map(draft => {
            if (!draft || !draft.id || !draft.state) return null;

            const validQuoteItems = (Array.isArray(draft.state.quoteItems) ? draft.state.quoteItems : [])
                .filter((item): item is QuoteItem => item && typeof item === 'object' && !!item.id);

            const validatedState: AppState = {
                currentStep: draft.state.currentStep || 1,
                quoteDetails: { ...initialQuoteDetails, ...(draft.state.quoteDetails || {}) },
                customer: { ...initialCustomer, ...(draft.state.customer || {}) },
                salesInfo: { ...initialSalesInfo, ...(draft.state.salesInfo || {}) },
                quoteItems: validQuoteItems,
                settings: { ...initialSettings, ...(draft.state.settings || {}) },
                displayConfig: { ...initialDisplayConfig, ...(draft.state.displayConfig || {}) },
            };
            return { ...draft, state: validatedState } as Draft;
        }).filter((d): d is Draft => d !== null);
        setDrafts(validatedDrafts);
      }

      // Load and validate products
      const savedProductsJSON = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (savedProductsJSON) {
        const parsedProducts = JSON.parse(savedProductsJSON);
        if (Array.isArray(parsedProducts)) {
            const validProducts = parsedProducts.filter((p): p is Product => p && typeof p === 'object' && !!p.id);
            setProducts(validProducts);
        } else {
            setProducts(MOCK_PRODUCTS);
        }
      } else {
        setProducts(MOCK_PRODUCTS);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage, clearing corrupted data.", error);
      localStorage.removeItem(DRAFTS_STORAGE_KEY);
      localStorage.removeItem(PRODUCTS_STORAGE_KEY);
      setProducts(MOCK_PRODUCTS);
    }
  }, []);


  useEffect(() => {
    try {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    } catch (error) {
        console.error("Failed to save products to localStorage", error);
    }
  }, [products]);

  // --- Handlers ---
  const showToast = (message: string) => setToastMessage(message);

  const resetQuoteState = () => {
    setCurrentStep(1);
    setQuoteDetails(initialQuoteDetails);
    setCustomer(initialCustomer);
    setSalesInfo(initialSalesInfo);
    setQuoteItems(initialQuoteItems);
    setSettings(initialSettings);
    setDisplayConfig(initialDisplayConfig);
    setActiveQuoteId(null);
  };
  
  const handleNewQuote = () => {
    resetQuoteState();
    setView('quote');
  };

  const handleReturnToHome = () => {
    resetQuoteState();
    setView('home');
  };

  const handleSaveDraft = () => {
    const currentState: AppState = { currentStep, quoteDetails, customer, salesInfo, quoteItems, settings, displayConfig };
    let updatedDrafts: Draft[];

    if (activeQuoteId) {
      updatedDrafts = drafts.map(d => d.id === activeQuoteId ? { ...d, name: currentState.quoteDetails.name, lastSaved: new Date().toISOString(), state: currentState } : d);
    } else {
      const newId = Date.now().toString();
      const newDraft: Draft = { id: newId, name: currentState.quoteDetails.name, lastSaved: new Date().toISOString(), state: currentState };
      updatedDrafts = [...drafts, newDraft];
      setActiveQuoteId(newId);
    }
    
    setDrafts(updatedDrafts);
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
    showToast('草稿已保存！');
  };
  
  const handleLoadDraft = (draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      const { state } = draft;
      setCurrentStep(state.currentStep);
      setQuoteDetails(state.quoteDetails);
      setCustomer(state.customer);
      setSalesInfo(state.salesInfo || initialSalesInfo);
      setQuoteItems(state.quoteItems);
      setSettings(state.settings);
      setDisplayConfig(state.displayConfig);
      setActiveQuoteId(draft.id);
      setView('quote');
    }
  };

  const handleDeleteDraft = (draftId: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    setDrafts(updatedDrafts);
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
    showToast('草稿已删除！');
  };
  
  const handleGeneratePdf = () => {
    try {
      window.print();
    } catch (error) {
      console.error("Could not trigger print dialog:", error);
      alert("无法打开打印窗口。请检查您的浏览器是否有阻止弹窗的设置。");
    }
  };

  const handleExportWord = async () => {
    if (!(window as any).docx || !(window as any).saveAs) {
      showToast('导出组件加载失败，请检查网络并刷新。');
      console.error('docx or FileSaver library not loaded.');
      return;
    }
    
    const { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, ImageRun, WidthType, AlignmentType, BorderStyle } = (window as any).docx;
    const { saveAs } = (window as any);
    
    const getImageBuffer = async (src: string) => {
        try {
            if (src.startsWith('data:image')) {
                const base64 = src.split(',')[1];
                return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            }
            const response = await fetch(src);
            if (!response.ok) return null;
            return await response.arrayBuffer();
        } catch (e) {
            console.error("Could not fetch image for Word export:", src, e);
            return null;
        }
    };
    
    const logoBuffer = quoteDetails.logo ? await getImageBuffer(quoteDetails.logo) : null;
    
    const docChildren = [
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({
                                children: [
                                    new TextRun({ text: quoteDetails.name, bold: true, size: 48 }),
                                    new TextRun({ text: `\n日期: ${quoteDetails.date}`, size: 24, break: 1 })
                                ]
                            })],
                            borders: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto" } },
                            verticalAlign: 'center',
                        }),
                        new TableCell({
                            children: logoBuffer ? [new Paragraph({
                                children: [new ImageRun({ data: logoBuffer, transformation: { width: 100, height: 100 } })],
                                alignment: AlignmentType.RIGHT,
                            })] : [],
                             borders: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto" } },
                        }),
                    ],
                }),
            ],
        }),
        new Paragraph({ text: "\n", spacing: { after: 400 } }),
        new Table({
             width: { size: 100, type: WidthType.PERCENTAGE },
             rows: [
                 new TableRow({
                     children: [
                         new TableCell({ children: [
                             new Paragraph({ text: "客户信息", style: "header-style" }),
                             new Paragraph({ text: `姓名: ${customer.name}` }),
                             new Paragraph({ text: `电话: ${customer.phone}` }),
                             new Paragraph({ text: `地址: ${customer.address}` }),
                         ], borders: { top: { style: 'none' }, bottom: { style: 'none' }, left: { style: 'none' }, right: { style: 'none' } } }),
                         new TableCell({ children: [
                             new Paragraph({ text: "销售代表信息", style: "header-style" }),
                             new Paragraph({ text: `姓名: ${salesInfo.name}` }),
                             new Paragraph({ text: `电话: ${salesInfo.phone}` }),
                         ], borders: { top: { style: 'none' }, bottom: { style: 'none' }, left: { style: 'none' }, right: { style: 'none' } } }),
                     ]
                 })
             ]
        }),
        new Paragraph({ text: "\n", spacing: { after: 400 } }),
    ];

    const tableHeader = [
        new TableCell({ children: [new Paragraph({ text: "产品名称/型号", bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: "详情", bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: "单价", bold: true, alignment: AlignmentType.RIGHT })] }),
        new TableCell({ children: [new Paragraph({ text: "数量", bold: true, alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ text: "小计", bold: true, alignment: AlignmentType.RIGHT })] }),
    ];
    if (displayConfig.productImage) {
        tableHeader.unshift(new TableCell({ children: [new Paragraph({ text: "图片", bold: true })] }));
    }
    if (displayConfig.installationDiagram) {
        tableHeader.splice(2, 0, new TableCell({ children: [new Paragraph({ text: "安装图", bold: true })] }));
    }

    const itemRows = await Promise.all(quoteItems.map(async item => {
        const itemImageBuffer = displayConfig.productImage && item.image ? await getImageBuffer(item.image) : null;
        const diagramImageBuffer = displayConfig.installationDiagram && item.installationDiagram ? await getImageBuffer(item.installationDiagram) : null;
        const effectivePrice = getEffectivePrice(item);

        const detailParagraphs = [
            displayConfig.dimensions && item.dimensions ? new Paragraph({ text: `尺寸: ${item.dimensions}`, style: "small-text" }) : null,
            displayConfig.powerConsumption && item.powerConsumption ? new Paragraph({ text: `功率: ${item.powerConsumption}`, style: "small-text" }) : null,
            displayConfig.energyEfficiency && item.energyEfficiency ? new Paragraph({ text: `能效: ${item.energyEfficiency}`, style: "small-text" }) : null,
            displayConfig.origin && item.origin ? new Paragraph({ text: `产地: ${item.origin}`, style: "small-text" }) : null,
            displayConfig.specialFeature && item.specialFeature ? new Paragraph({ text: `特性: ${item.specialFeature}`, style: "small-text" }) : null,
            displayConfig.warranty && item.warranty ? new Paragraph({ text: `质保: ${item.warranty}`, style: "small-text" }) : null,
        ].filter(p => p !== null) as InstanceType<typeof Paragraph>[];

        const cells = [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.name, bold: true }), new TextRun({ text: `\n${item.model}`, break: 1, color: "888888" })] })] }),
            new TableCell({ children: detailParagraphs }),
            new TableCell({ children: [new Paragraph({ text: `¥${effectivePrice.toFixed(2)}`, alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: `${item.quantity}`, alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: `¥${(effectivePrice * item.quantity).toFixed(2)}`, alignment: AlignmentType.RIGHT, bold: true })] }),
        ];
        if(displayConfig.productImage) {
             cells.unshift(new TableCell({ children: itemImageBuffer ? [new Paragraph({ children: [new ImageRun({ data: itemImageBuffer, transformation: { width: 50, height: 50 } })]})] : [] }));
        }
        if(displayConfig.installationDiagram) {
             cells.splice(2, 0, new TableCell({ children: diagramImageBuffer ? [new Paragraph({ children: [new ImageRun({ data: diagramImageBuffer, transformation: { width: 50, height: 50 } })]})] : [] }));
        }

        return new TableRow({ children: cells });
    }));

    const productTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: tableHeader, tableHeader: true }), ...itemRows]
    });
    
    docChildren.push(productTable);
    
    const currentSubtotal = quoteItems.reduce((acc, item) => acc + getEffectivePrice(item) * item.quantity, 0);
    const currentDiscountAmount = currentSubtotal * (settings.discount / 100);
    const currentTotalAfterDiscount = currentSubtotal - currentDiscountAmount;
    const currentVatAmount = settings.includeVat ? currentTotalAfterDiscount * 0.13 : 0;
    const currentGrandTotal = currentTotalAfterDiscount + currentVatAmount;
    
    const totalsParagraphs = [
      new Paragraph({ children: [new TextRun("小计:"), new TextRun({ text: `¥${currentSubtotal.toFixed(2)}`, alignment: AlignmentType.RIGHT })], tabStops: [{ type: "right", position: 4535 }] }),
      new Paragraph({ children: [new TextRun(`折扣 (${settings.discount}%):`), new TextRun({ text: `-¥${currentDiscountAmount.toFixed(2)}`, alignment: AlignmentType.RIGHT })], tabStops: [{ type: "right", position: 4535 }] }),
      settings.includeVat ? new Paragraph({ children: [new TextRun("增值税 (13%):"), new TextRun({ text: `¥${currentVatAmount.toFixed(2)}`, alignment: AlignmentType.RIGHT })], tabStops: [{ type: "right", position: 4535 }] }) : null,
      new Paragraph({ children: [new TextRun({ text: "总计:", bold: true }), new TextRun({ text: `¥${currentGrandTotal.toFixed(2)}`, bold: true, alignment: AlignmentType.RIGHT })], tabStops: [{ type: "right", position: 4535 }], border: { top: { style: BorderStyle.SINGLE, size: 4, color: "auto" } } }),
    ].filter(p => p !== null) as InstanceType<typeof Paragraph>[];

    docChildren.push(new Paragraph({ text: "\n" }));
    docChildren.push(...totalsParagraphs);
    docChildren.push(new Paragraph({ text: "\n\n条款 & 备注", style: "header-style" }));
    docChildren.push(new Paragraph({ text: settings.terms || '无' }));

    const doc = new Document({
        styles: {
            paragraphStyles: [
                { id: "header-style", name: "Header Style", run: { bold: true, size: 28 }, paragraph: { spacing: { after: 200 } } },
                { id: "small-text", name: "Small Text", run: { size: 18, color: "595959" } },
            ],
        },
        sections: [{ children: docChildren }]
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `${quoteDetails.name}.docx`);
      showToast('Word 文档已开始下载！');
    });
  };

  // --- Quote Step 3 Handlers ---
  const handleNext = () => setCurrentStep(s => Math.min(s + 1, STEPS.length));
  const handlePrev = () => setCurrentStep(s => Math.max(s - 1, 1));
  const handleQuantityChange = (id: string, newQuantity: number) => setQuoteItems(items => items.map(item => item.id === id ? { ...item, quantity: newQuantity } : item));
  const handlePriceChange = (id: string, newPrice: number | undefined) => {
    setQuoteItems(items => items.map(item => {
        if (item.id === id) {
            // If newPrice is undefined or same as unitPrice, we remove the override
            if (newPrice === undefined || newPrice === item.unitPrice) {
                const { quotePrice, ...rest } = item;
                return rest;
            }
            return { ...item, quotePrice: newPrice };
        }
        return item;
    }));
  };
  const handleRemoveItem = (id: string) => setQuoteItems(items => items.filter(item => item.id !== id));
  const handleAddItem = (product: Product) => {
    setQuoteItems(prevItems => {
        const existingItem = prevItems.find(item => item.id === product.id);
        if (existingItem) {
            return prevItems.map(item => item.id === product.id ? {...item, quantity: item.quantity + 1} : item);
        }
        return [...prevItems, {...product, quantity: 1}];
    });
  };
  const handleDisplayConfigChange = (key: keyof DisplayConfig, value: boolean) => setDisplayConfig(config => ({ ...config, [key]: value }));

  const handleLogoChange = (file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          if (e.target?.result) {
              setQuoteDetails(d => ({ ...d, logo: e.target.result as string }));
          }
      };
      reader.readAsDataURL(file);
  };

  // --- Product Management Handlers ---
  const handleAddNewProduct = () => {
    setEditingProduct(emptyProduct);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };
  
  const handleSaveProduct = () => {
    if (!editingProduct || !editingProduct.name || !editingProduct.model) {
      alert('产品名称和型号是必填项！');
      return;
    }

    if (editingProduct.id) { // Update existing
      setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
      showToast('产品已更新！');
    } else { // Create new
      const newProduct = { ...editingProduct, id: `prod-${Date.now()}`};
      setProducts([...products, newProduct]);
      showToast('产品已添加！');
    }
    
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };
  
  const handleDeleteProduct = (productId: string) => {
      setProducts(products.filter(p => p.id !== productId));
      showToast('产品已删除！');
  };
  
  const handleProductFormChange = (field: keyof Product, value: string | number) => {
    if (editingProduct) {
        setEditingProduct({ ...editingProduct, [field]: value });
    }
  };

  const handleProductImageChange = (field: 'image' | 'installationDiagram', file: File | null) => {
      if (!file || !editingProduct) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          if (e.target?.result) {
              setEditingProduct({ ...editingProduct, [field]: e.target.result as string });
          }
      };
      reader.readAsDataURL(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim() !== '');
      if (rows.length < 1) return;
      const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = rows.slice(1).map(row => row.split(',').map(d => d.trim().replace(/"/g, '')));
      
      setCsvHeaders(headers);
      setCsvData(data);
      
      // Auto-map headers
      const initialMappings: Record<string, keyof Product | 'ignore'> = {};
      const productKeys = Object.keys(emptyProduct) as (keyof Product)[];
      headers.forEach(header => {
        const foundKey = productKeys.find(key => key.toLowerCase() === header.toLowerCase());
        initialMappings[header] = foundKey || 'ignore';
      });
      setCsvMappings(initialMappings);

      setIsCsvModalOpen(true);
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = ''; // Reset file input
  };
  
  const handleProcessCsvImport = () => {
    const newProducts: Product[] = csvData.map(row => {
      const product: Partial<Product> = {};
      csvHeaders.forEach((header, index) => {
        const mappedField = csvMappings[header];
        if (mappedField && mappedField !== 'ignore') {
          (product as any)[mappedField] = row[index];
        }
      });
      product.unitPrice = parseFloat(String(product.unitPrice)) || 0;
      product.id = `prod-${Date.now()}-${Math.random()}`;
      return product as Product;
    }).filter(p => p.name && p.model);

    setProducts(prev => [...prev, ...newProducts]);
    showToast(`${newProducts.length} 个产品已成功导入！`);
    setIsCsvModalOpen(false);
  };


  // --- Calculations ---
  const subtotal = quoteItems.reduce((acc, item) => acc + getEffectivePrice(item) * item.quantity, 0);
  const discountAmount = subtotal * (settings.discount / 100);
  const totalAfterDiscount = subtotal - discountAmount;
  const vatAmount = settings.includeVat ? totalAfterDiscount * 0.13 : 0;
  const grandTotal = totalAfterDiscount + vatAmount;
  
  const filteredProducts = products.filter(p => {
    if (!p) return false;
    return (p.name || '').toLowerCase().includes(productSearchTerm.toLowerCase()) ||
           (p.model || '').toLowerCase().includes(productSearchTerm.toLowerCase()) ||
           (p.description || '').toLowerCase().includes(productSearchTerm.toLowerCase())
  });

  // --- Render Logic ---
  const renderStepContent = () => {
    switch (currentStep) {
        case 1:
            return (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
                <h2 className="text-xl font-bold text-gray-700 mb-4">第一步：基本报价信息</h2>
                <div className="space-y-4">
                  <FormInput label="报价单名称" id="quoteName" value={quoteDetails.name} onChange={(e) => setQuoteDetails(d => ({ ...d, name: e.target.value }))} />
                  <FormInput label="报价日期" id="quoteDate" value={quoteDetails.date} onChange={(e) => setQuoteDetails(d => ({ ...d, date: e.target.value }))} />
                   <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">自定义LOGO</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={e => handleLogoChange(e.target.files?.[0] || null)} 
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {quoteDetails.logo && <img src={quoteDetails.logo} alt="LOGO预览" className="w-16 h-16 rounded-md object-contain border p-1"/>}
                        </div>
                    </div>
                </div>
                <NavigationButtons onNext={handleNext} />
              </div>
            );
        case 2:
            return (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
                    <h2 className="text-xl font-bold text-gray-700 mb-6">第二步：联系人信息</h2>
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-600 mb-3 border-b pb-2">客户信息</h3>
                            <div className="space-y-4">
                                <FormInput label="客户姓名" id="customerName" value={customer.name} onChange={(e) => setCustomer(c => ({...c, name: e.target.value}))} placeholder="请输入客户姓名"/>
                                <FormInput label="联系电话" id="customerPhone" value={customer.phone} onChange={(e) => setCustomer(c => ({...c, phone: e.target.value}))} placeholder="请输入联系电话"/>
                                <FormInput label="客户地址" id="customerAddress" value={customer.address} onChange={(e) => setCustomer(c => ({...c, address: e.target.value}))} placeholder="请输入客户地址"/>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-600 mb-3 border-b pb-2">销售代表信息</h3>
                             <div className="space-y-4">
                                <FormInput label="销售姓名" id="salesName" value={salesInfo.name} onChange={(e) => setSalesInfo(c => ({...c, name: e.target.value}))} placeholder="请输入销售姓名"/>
                                <FormInput label="销售电话" id="salesPhone" value={salesInfo.phone} onChange={(e) => setSalesInfo(c => ({...c, phone: e.target.value}))} placeholder="请输入销售电话"/>
                            </div>
                        </div>
                    </div>
                    <NavigationButtons onPrev={handlePrev} onNext={handleNext} nextDisabled={!customer.name}/>
                </div>
            );
        case 3:
            return (
                <div className="flex space-x-8 h-full">
                    <div className="flex-grow flex flex-col space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-xl font-bold text-gray-700 mb-4">整体报价设置</h2>
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">折扣</label>
                                <div className="flex items-center space-x-4">
                                  <span>0%</span>
                                  <input type="range" min="0" max="100" value={settings.discount} onChange={(e) => setSettings(s => ({ ...s, discount: parseInt(e.target.value, 10) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#009999]" />
                                  <span>{settings.discount}%</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4 pt-6">
                                <input type="checkbox" id="includeVat" checked={settings.includeVat} onChange={(e) => setSettings(s => ({ ...s, includeVat: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-[#009999] focus:ring-[#009999]" />
                                <label htmlFor="includeVat" className="text-sm font-medium text-gray-600">包含增值税 (VAT 13%)</label>
                              </div>
                            </div>
                            <div className="mt-4">
                              <label htmlFor="terms" className="block text-sm font-medium text-gray-600 mb-2">条款 & 备注</label>
                              <textarea id="terms" rows={3} value={settings.terms} onChange={(e) => setSettings(s => ({ ...s, terms: e.target.value }))} placeholder="例如：支付条款、安装说明等..." className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009999] focus:border-transparent"></textarea>
                            </div>
                        </div>
                        
                        <div className="flex-grow bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
                            <div className="p-6 border-b flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-700">已选产品列表</h2>
                                <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-[#009999] text-white rounded-md hover:bg-teal-600 transition-colors flex items-center space-x-2">
                                    <Icon name="plus" className="w-5 h-5"/>
                                    <span>添加产品</span>
                                </button>
                            </div>
                            <div className="flex-grow overflow-y-auto">
                                {quoteItems.length > 0 ? quoteItems.map(item => (
                                    <ProductItem key={item.id} item={item} onQuantityChange={handleQuantityChange} onPriceChange={handlePriceChange} onRemove={handleRemoveItem}/>
                                )) : <p className="text-center text-gray-500 p-8">请点击 "添加产品" 按钮来选择产品。</p>}
                            </div>
                            {quoteItems.length > 0 && (
                                <div className="p-6 border-t flex justify-end font-semibold text-xl text-gray-800">
                                    <span>总计: </span>
                                    <span className="ml-4 w-40 text-right">¥ {grandTotal.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                        <NavigationButtons onPrev={handlePrev} onNext={handleNext} nextDisabled={quoteItems.length === 0} prevLabel="上一步 (客户信息)" nextLabel="下一步 (预览与导出)" />
                    </div>

                    <aside className="w-96 flex-shrink-0">
                        <div className="sticky top-8">
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                                <h3 className="text-lg font-bold text-gray-700 mb-4">显示/隐藏字段</h3>
                                <div className="space-y-3">
                                    {Object.entries(displayConfigLabels).map(([key, label]) => (
                                    <div key={key} className="flex justify-between items-center">
                                        <label htmlFor={`toggle-${key}`} className="text-gray-600">{label}</label>
                                        <ToggleSwitch id={`toggle-${key}`} checked={displayConfig[key as keyof DisplayConfig]} onChange={(checked) => handleDisplayConfigChange(key as keyof DisplayConfig, checked)}/>
                                    </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                                <h3 className="text-center font-bold text-gray-700 mb-2">实时报价预览</h3>
                                <div className="w-full h-96 bg-gray-50 border-2 border-dashed rounded-md p-3 overflow-y-auto text-xs">
                                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                                        {quoteDetails.logo ? (
                                            <img src={quoteDetails.logo} alt="logo" className="w-12 h-12 object-contain"/>
                                        ) : (
                                            <div className="w-10 h-10 bg-[#00334d] flex items-center justify-center rounded-full text-white text-[8px] font-bold">LOGO</div>
                                        )}
                                        <div className="text-right">
                                            <p className="font-bold">{quoteDetails.name}</p>
                                            <p className="text-gray-500">日期: {quoteDetails.date}</p>
                                        </div>
                                    </div>
                                    {quoteItems.map(item => (
                                        <div key={`preview-${item.id}`} className="grid grid-cols-12 gap-1 mb-2 items-center p-1 rounded bg-white border">
                                            {displayConfig.productImage && <img src={item.image} className="col-span-2 w-8 h-8 rounded-sm object-contain"/>}
                                            <div className={displayConfig.productImage ? 'col-span-6' : 'col-span-8'}>
                                                <p className="font-semibold">{item.name} <span className="text-gray-500">({item.model})</span></p>
                                                <div className="flex flex-wrap text-gray-600 text-[10px] gap-x-2">
                                                    {displayConfig.dimensions && <span>尺寸: {item.dimensions}</span>}
                                                    {displayConfig.powerConsumption && <span>功率: {item.powerConsumption}</span>}
                                                    {displayConfig.energyEfficiency && <span>能效: {item.energyEfficiency}</span>}
                                                    {displayConfig.origin && <span>产地: {item.origin}</span>}
                                                    {displayConfig.specialFeature && <span>特性: {item.specialFeature}</span>}
                                                    {displayConfig.warranty && <span>质保: {item.warranty}</span>}
                                                    {displayConfig.installationDiagram && item.installationDiagram && <span>安装图: [有]</span>}
                                                </div>
                                            </div>
                                            <div className="col-span-1 text-center">x{item.quantity}</div>
                                            <div className="col-span-3 text-right font-semibold">¥{(getEffectivePrice(item) * item.quantity).toFixed(2)}</div>
                                        </div>
                                    ))}
                                    <div className="mt-4 pt-2 border-t">
                                        <div className="flex justify-between"><span className="text-gray-600">小计:</span> <span>¥{subtotal.toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600">折扣 ({settings.discount}%):</span> <span className="text-red-500">-¥{discountAmount.toFixed(2)}</span></div>
                                        {settings.includeVat && <div className="flex justify-between"><span className="text-gray-600">增值税 (13%):</span> <span>¥{vatAmount.toFixed(2)}</span></div>}
                                        <div className="flex justify-between font-bold mt-1 text-sm"><span >总计:</span> <span>¥{grandTotal.toFixed(2)}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            );
        case 4:
            return (
                <div className="flex flex-col h-full print:block">
                  <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 flex-grow" id="print-area">
                    <style>{`
                      @media print {
                        body * { visibility: hidden; }
                        #print-area, #print-area * { visibility: visible; }
                        #print-area { position: absolute; left: 0; top: 0; width: 100%; }
                      }
                    `}</style>
                    <div className="flex justify-between items-start pb-4 border-b">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800">{quoteDetails.name}</h2>
                            <p className="text-gray-500 mt-1">日期: {quoteDetails.date}</p>
                        </div>
                         {quoteDetails.logo ? (
                            <img src={quoteDetails.logo} alt="logo" className="w-24 h-24 object-contain"/>
                        ) : (
                            <div className="w-20 h-20 bg-[#00334d] flex items-center justify-center rounded-full text-white font-bold">LOGO</div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-8 my-8 text-base">
                        <div>
                            <h3 className="font-bold text-gray-700 mb-3 text-lg border-b pb-2">客户信息</h3>
                            <p className="text-gray-600 mt-2"><strong>姓名:</strong> {customer.name}</p>
                            <p className="text-gray-600 mt-2"><strong>电话:</strong> {customer.phone}</p>
                            <p className="text-gray-600 mt-2"><strong>地址:</strong> {customer.address}</p>
                        </div>
                         <div>
                            <h3 className="font-bold text-gray-700 mb-3 text-lg border-b pb-2">销售代表信息</h3>
                            <p className="text-gray-600 mt-2"><strong>姓名:</strong> {salesInfo.name}</p>
                            <p className="text-gray-600 mt-2"><strong>电话:</strong> {salesInfo.phone}</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-sm">
                                <tr>
                                    {displayConfig.productImage && <th className="p-3">图片</th>}
                                    <th className="p-3">产品名称/型号</th>
                                    <th className="p-3">详情</th>
                                    {displayConfig.installationDiagram && <th className="p-3">安装图</th>}
                                    <th className="p-3 text-right">单价</th>
                                    <th className="p-3 text-center">数量</th>
                                    <th className="p-3 text-right">小计</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quoteItems.map(item => {
                                    const effectivePrice = getEffectivePrice(item);
                                    return (
                                        <tr key={item.id} className="border-b">
                                            {displayConfig.productImage && <td className="p-3"><img src={item.image} alt={item.name} onClick={() => setViewingImage(item.image)} className="w-12 h-12 rounded object-contain cursor-pointer hover:opacity-75"/></td>}
                                            <td className="p-3 font-semibold">{item.name}<br/><span className="font-normal text-gray-500">{item.model}</span></td>
                                            <td className="p-3 text-sm text-gray-600">
                                                {displayConfig.dimensions && <div>尺寸: {item.dimensions}</div>}
                                                {displayConfig.powerConsumption && <div>功率: {item.powerConsumption}</div>}
                                                {displayConfig.energyEfficiency && <div>能效: {item.energyEfficiency}</div>}
                                                {displayConfig.origin && <div>产地: {item.origin}</div>}
                                                {displayConfig.specialFeature && <div>特性: {item.specialFeature}</div>}
                                                {displayConfig.warranty && <div>质保: {item.warranty}</div>}
                                            </td>
                                            {displayConfig.installationDiagram && <td className="p-3">{item.installationDiagram ? <img src={item.installationDiagram} alt="安装图" onClick={() => setViewingImage(item.installationDiagram || '')} className="w-12 h-12 rounded object-contain cursor-pointer hover:opacity-75"/> : <span>无</span>}</td>}
                                            <td className="p-3 text-right">¥{effectivePrice.toFixed(2)}</td>
                                            <td className="p-3 text-center">{item.quantity}</td>
                                            <td className="p-3 text-right font-semibold">¥{(effectivePrice * item.quantity).toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end mt-6">
                        <div className="w-1/3">
                            <div className="flex justify-between text-gray-600"><p>小计:</p><p>¥{subtotal.toFixed(2)}</p></div>
                            <div className="flex justify-between text-gray-600"><p>折扣 ({settings.discount}%):</p><p className="text-red-500">-¥{discountAmount.toFixed(2)}</p></div>
                             {settings.includeVat && <div className="flex justify-between text-gray-600"><p>增值税 (13%):</p><p>¥{vatAmount.toFixed(2)}</p></div>}
                            <div className="flex justify-between font-bold text-xl mt-2 pt-2 border-t"><p>总计:</p><p>¥{grandTotal.toFixed(2)}</p></div>
                        </div>
                    </div>
                     <div className="mt-8 pt-4 border-t">
                        <h3 className="font-semibold text-gray-700 mb-2">条款 & 备注</h3>
                        <p className="text-gray-600 whitespace-pre-wrap">{settings.terms || '无'}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-6 print:hidden">
                    <NavigationButtons onPrev={handlePrev} prevLabel="返回编辑"/>
                    <div className="flex space-x-3">
                        <button onClick={handleExportWord} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">导出Word</button>
                        <button onClick={handleGeneratePdf} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">打印 / 另存为PDF</button>
                    </div>
                  </div>
                </div>
            );
        default: return null;
    }
  };
  
  const renderProductManagement = () => (
    <main className="flex-grow container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">产品库管理</h1>
        <div className="flex items-center space-x-4">
          <button onClick={() => setView('home')} className="px-5 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center space-x-2">
            <Icon name="home" className="w-5 h-5" />
            <span>返回主页</span>
          </button>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2">
            <Icon name="upload" className="w-5 h-5"/>
            <span>从 CSV 导入</span>
          </button>
          <button onClick={handleAddNewProduct} className="px-5 py-2 bg-[#007bff] text-white rounded-md hover:bg-blue-600 transition-colors flex items-center space-x-2">
            <Icon name="plus" className="w-5 h-5"/>
            <span>添加新产品</span>
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 uppercase text-sm">
            <tr>
              <th className="p-4">图片</th>
              <th className="p-4">名称 / 型号</th>
              <th className="p-4">描述</th>
              <th className="p-4 text-right">单价</th>
              <th className="p-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.length > 0 ? products.map(product => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="p-4"><img src={product.image} alt={product.name} onClick={() => setViewingImage(product.image)} className="w-12 h-12 rounded object-contain cursor-pointer hover:opacity-75"/></td>
                <td className="p-4 font-semibold">{product.name}<br/><span className="font-normal text-gray-500">{product.model}</span></td>
                <td className="p-4 text-sm text-gray-600 max-w-sm truncate">{product.description}</td>
                <td className="p-4 text-right font-semibold">¥{product.unitPrice.toFixed(2)}</td>
                <td className="p-4 text-center">
                  <div className="flex justify-center items-center space-x-2">
                    <button onClick={() => handleEditProduct(product)} className="p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-blue-50" title="编辑"><Icon name="edit" className="w-5 h-5"/></button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50" title="删除"><Icon name="trash" className="w-5 h-5"/></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="text-center text-gray-500 p-12">产品库为空。请添加新产品或从CSV文件导入。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header isQuoting={view !== 'home'} onSave={view === 'quote' ? handleSaveDraft : undefined} onReturnToHome={handleReturnToHome} />
      
      {view === 'home' && (
        <main className="flex-grow container mx-auto p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">我的报价单草稿</h1>
                <div className="flex items-center space-x-4">
                    <button onClick={() => setView('productManagement')} className="px-5 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2">
                        <Icon name="box" className="w-5 h-5"/>
                        <span>产品库管理</span>
                    </button>
                    <button onClick={handleNewQuote} className="px-5 py-2 bg-[#007bff] text-white rounded-md hover:bg-blue-600 transition-colors flex items-center space-x-2">
                        <Icon name="plus" className="w-5 h-5"/>
                        <span>创建新报价单</span>
                    </button>
                </div>
            </div>
            <div className="space-y-4">
                {drafts.length > 0 ? (
                    drafts.sort((a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime()).map(draft => {
                        const total = calculateQuoteTotal(draft.state.quoteItems, draft.state.settings);
                        const itemCount = draft.state.quoteItems.length;
                        return (
                             <div key={draft.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="flex-grow">
                                  <p className="font-bold text-lg text-gray-800">{draft.name}</p>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                                    <span>最后保存: {new Date(draft.lastSaved).toLocaleString('zh-CN')}</span>
                                    <span className="w-1 h-1 bg-gray-400 rounded-full hidden sm:block"></span>
                                    <span>{itemCount} 个产品</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
                                  <p className="font-semibold text-lg text-[#00334d] flex-grow sm:flex-grow-0 text-right">¥{total.toFixed(2)}</p>
                                  <div className="flex items-center space-x-1 border-l pl-4">
                                    <button onClick={() => handleLoadDraft(draft.id)} className="p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-blue-50" title="编辑"><Icon name="edit" className="w-5 h-5"/></button>
                                    <button onClick={() => handleDeleteDraft(draft.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50" title="删除"><Icon name="trash" className="w-5 h-5"/></button>
                                  </div>
                                </div>
                              </div>
                        )
                    })
                ) : (
                    <div className="text-center text-gray-500 p-12 bg-white rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold">没有找到任何草稿</h3>
                        <p className="mt-2">点击右上角的 "创建新报价单" 开始吧！</p>
                    </div>
                )}
            </div>
        </main>
      )}

      {view === 'productManagement' && renderProductManagement()}

      {view === 'quote' && (
        <main className="flex-grow container mx-auto p-8 flex space-x-8">
            <aside className="w-64 flex-shrink-0">
              <Stepper steps={STEPS} currentStep={currentStep} />
            </aside>
            <div className="flex-grow flex flex-col">
              {renderStepContent()}
            </div>
        </main>
      )}
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-700">选择产品</h2>
                    <input type="text" placeholder="搜索产品名称、型号、描述..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009999] focus:border-transparent"/>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-800 text-3xl font-bold">&times;</button>
                </div>
                <div className="overflow-y-auto p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.length > 0 ? filteredProducts.map(product => (
                        <div key={product.id} className="border rounded-lg p-4 flex flex-col hover:shadow-md transition-shadow">
                            <img src={product.image} alt={product.name} className="w-24 h-24 mx-auto rounded-md object-contain"/>
                            <div className="text-center mt-2 flex-grow">
                                <p className="font-semibold">{product.name}</p>
                                <p className="text-sm text-gray-500">{product.model}</p>
                                <p className="text-sm text-gray-600 my-1">{product.description}</p>
                                <p className="font-bold text-lg text-[#009999]">¥{product.unitPrice.toFixed(2)}</p>
                            </div>
                            <button onClick={() => handleAddItem(product)} className="mt-3 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-[#009999] hover:text-white transition-colors">添加到报价单</button>
                        </div>
                    )) : (<div className="col-span-full text-center text-gray-500 py-16"><p className="text-lg">未找到匹配的产品。</p><p className="text-sm mt-1">请尝试其他搜索关键词。</p></div>)}
                    </div>
                </div>
                <div className="p-4 border-t text-right"><button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-[#007bff] text-white rounded-md hover:bg-blue-600">完成</button></div>
            </div>
        </div>
      )}
      
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <h2 className="p-6 text-xl font-bold text-gray-700 border-b">{editingProduct.id ? '编辑产品' : '添加新产品'}</h2>
            <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <FormInput label="产品名称*" id="prodName" value={editingProduct.name} onChange={e => handleProductFormChange('name', e.target.value)} />
                    </div>
                    <div>
                        <FormInput label="产品型号*" id="prodModel" value={editingProduct.model} onChange={e => handleProductFormChange('model', e.target.value)} />
                    </div>
                </div>
                <FormInput label="产品描述" id="prodDesc" value={editingProduct.description} onChange={e => handleProductFormChange('description', e.target.value)} />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput label="单价*" id="prodPrice" type="number" value={editingProduct.unitPrice} onChange={e => handleProductFormChange('unitPrice', parseFloat(e.target.value) || 0)} />
                    <div></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">产品图片</label>
                        <input type="file" accept="image/*" onChange={e => handleProductImageChange('image', e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        {editingProduct.image && <img src={editingProduct.image} alt="产品预览" className="mt-4 w-32 h-32 rounded-md object-contain border"/>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">安装图</label>
                        <input type="file" accept="image/*" onChange={e => handleProductImageChange('installationDiagram', e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        {editingProduct.installationDiagram && <img src={editingProduct.installationDiagram} alt="安装图预览" className="mt-4 w-32 h-32 rounded-md object-contain border"/>}
                    </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-600 pt-4 border-t mt-6">详细参数</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="尺寸" id="prodDims" value={editingProduct.dimensions} onChange={e => handleProductFormChange('dimensions', e.target.value)} />
                    <FormInput label="额定功率" id="prodPower" value={editingProduct.powerConsumption} onChange={e => handleProductFormChange('powerConsumption', e.target.value)} />
                    <FormInput label="能效等级" id="prodEnergy" value={editingProduct.energyEfficiency} onChange={e => handleProductFormChange('energyEfficiency', e.target.value)} />
                    <FormInput label="原产地" id="prodOrigin" value={editingProduct.origin} onChange={e => handleProductFormChange('origin', e.target.value)} />
                    <FormInput label="特殊功能" id="prodFeature" value={editingProduct.specialFeature} onChange={e => handleProductFormChange('specialFeature', e.target.value)} />
                    <FormInput label="质保期" id="prodWarranty" value={editingProduct.warranty} onChange={e => handleProductFormChange('warranty', e.target.value)} />
                </div>
            </div>
            <div className="p-4 border-t flex justify-end space-x-3">
              <button onClick={() => setIsProductModalOpen(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">取消</button>
              <button onClick={handleSaveProduct} className="px-6 py-2 bg-[#007bff] text-white rounded-md hover:bg-blue-600">保存</button>
            </div>
          </div>
        </div>
      )}
      
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <h2 className="p-6 text-xl font-bold text-gray-700 border-b">CSV 导入：列映射</h2>
            <div className="p-6 overflow-y-auto">
              <p className="mb-4 text-gray-600">请将您的 CSV 文件列（左侧）匹配到应用内的产品字段（右侧）。系统已尝试自动匹配。</p>
              <div className="space-y-3">
                {csvHeaders.map(header => (
                  <div key={header} className="grid grid-cols-2 gap-4 items-center">
                    <span className="font-semibold text-gray-700 bg-gray-100 p-2 rounded-md">{header}</span>
                    <select 
                        value={csvMappings[header]} 
                        onChange={e => setCsvMappings({...csvMappings, [header]: e.target.value as keyof Product | 'ignore'})}
                        className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009999]"
                    >
                      <option value="ignore">-- 忽略此列 --</option>
                      {Object.keys(emptyProduct).map(key => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
               <h3 className="text-lg font-semibold text-gray-600 pt-4 border-t mt-6 mb-2">数据预览 (前5行)</h3>
               <div className="overflow-x-auto border rounded-md">
                   <table className="w-full text-left text-sm">
                       <thead className="bg-gray-50">
                           <tr>{csvHeaders.map(h => <th key={h} className="p-2 font-medium">{h}</th>)}</tr>
                       </thead>
                       <tbody className="divide-y">
                           {csvData.slice(0, 5).map((row, i) => (
                               <tr key={i}>{row.map((cell, j) => <td key={j} className="p-2">{cell}</td>)}</tr>
                           ))}
                       </tbody>
                   </table>
               </div>
            </div>
            <div className="p-4 border-t flex justify-end space-x-3">
              <button onClick={() => setIsCsvModalOpen(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">取消</button>
              <button onClick={handleProcessCsvImport} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">确认并导入</button>
            </div>
          </div>
        </div>
      )}
      
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] cursor-zoom-out"
          onClick={() => setViewingImage(null)}
        >
          <img 
            src={viewingImage} 
            alt="全图预览" 
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()} // Prevents closing when clicking the image itself
          />
        </div>
      )}

      <Toast message={toastMessage} show={!!toastMessage} onDismiss={() => setToastMessage('')} />
    </div>
  );
}

export default App;
