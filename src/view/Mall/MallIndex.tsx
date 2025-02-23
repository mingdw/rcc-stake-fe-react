import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Layout, Input, Menu, Card, Row, Col, Button, Pagination, Empty, Tooltip, Tag, Typography, Tree } from 'antd';
import {
  ShoppingCartOutlined,
  SearchOutlined,
  RightOutlined,
  BarsOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
  FireOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import stylesCss from './MallIndex.module.scss';
import { Header } from 'antd/es/layout/layout';
import { Product, products, } from '../../api/mockDatas'; // 导入数据
import { getCategoryList } from "../../api/apiService";

import { useNavigate, useLocation } from 'react-router-dom';
import { Key } from 'antd/es/table/interface';
const { Search } = Input;
const { SubMenu } = Menu;
const { Text, Paragraph } = Typography; 

// 添加所有需要的类型定义
type SortDirection = 'asc' | 'desc';
type SortField = 'price' | 'sold' | 'stock';
type SortType = 'default' | `${SortField}${'Asc' | 'Desc'}`; // 使用模板字面量类型

interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

interface CategoryTitleProps {
  category: {
    code: string;
    icon?: React.ReactNode;
    name: string;
  };
  total: number;
  onViewMore?: () => void;
  sortType?: SortType;
  onSortChange?: (type: SortType) => void;
}

interface Attr{
  id: number;
  name: string;
  code: string;
  sort: number;
  status: number;
  type:number;
}

interface AttrGroup {
  id: number;
  name: string;
  code: string;
  status:number;
  type:number;
  sort: number;
  attrs: Attr[];
}

interface CategoryResponse {
  id: number;
  name: string;
  code: string;
  level: number;
  sort: number;
  parentId: number;
  icon?: string;
  attrGroups?: AttrGroup[];
  children?: CategoryResponse[];
}


const MallIndex: React.FC = () => {
  const [showAllCategories, setShowAllCategories] = useState(true); // 默认为 true
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]); // 场景标签
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]); // 风格标签
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategoryList();
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setCategories([]); // 错误时设置为空数组
      }
    };
  
    fetchCategories();
  }, []);

 const categoryRefs = useRef<{ [key: string]: React.RefObject<HTMLDivElement> }>({});

useEffect(() => {
  categoryRefs.current = (categories || []).reduce((acc, category) => ({
    ...acc,
    [category.code]: React.createRef<HTMLDivElement>()
  }), {});
}, [categories]);
  const [activeKey, setActiveKey] = useState<string>('all'); // 添加选中状态
  const [sortType, setSortType] = useState<string>('default');
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // 从 URL 参数中获取分类
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
      setShowAllCategories(false); // 确保不显示全部商品视图
      
      // 查找并设置一级分类为选中状态
      const firstLevelKey = getFirstLevelKey(categoryFromUrl);
      setActiveKey(firstLevelKey);
      // 展开对应的分类菜单
      const expandKeys: string[] = [];
      categories.forEach(cat => {
        if (cat.code === categoryFromUrl) {
          expandKeys.push(cat.code);
        }
        cat.children?.forEach(subCat => {
          if (subCat.code === categoryFromUrl) {
            expandKeys.push(cat.code, subCat.code);
          }
          subCat.children?.forEach(thirdCat => {
            if (thirdCat.code === categoryFromUrl) {
              expandKeys.push(cat.code, subCat.code, thirdCat.code);
            }
          });
        });
      });
      setExpandedKeys(expandKeys);
    }
  }, [location.search]);

  // 处理分类选择
  const onSelect = (selectedKeys: Key[], info: any) => {
    const selectedKey = selectedKeys[0] as string;
    setSelectedCategory(selectedKey);
    
    // 更新 URL 参数
    navigate(`/mall?category=${selectedKey}`);
  };

  // 按分类组织商品
  const groupedProducts = useMemo(() => {
    return categories.reduce((acc, category) => {
      // 处理一级分类
      acc[category.code] = products.filter(product => {
        // 匹配当前一级分类及其所有子分类的商品
        return product.category === category.code || 
               category.children?.some(subCat => 
                 product.subCategory === subCat.code ||
                 subCat.children?.some(thirdCat => 
                   product.thirdCategory === thirdCat.code
                 )
               );
      });

      // 处理二级分类
      category.children?.forEach(subCategory => {
        acc[subCategory.code] = products.filter(product => 
          // 匹配当前二级分类及其子分类的商品
          product.subCategory === subCategory.code ||
          subCategory.children?.some(thirdCat => 
            product.thirdCategory === thirdCat.code
          )
        );

        // 处理三级分类
        subCategory.children?.forEach(thirdCategory => {
          acc[thirdCategory.code] = products.filter(product => 
            // 只匹配当前三级分类的商品
            product.thirdCategory === thirdCategory.code
          );
        });
      });

      return acc;
    }, {} as { [key: string]: Product[] });
  }, []);  // 空依赖数组，因为 products 和 categories 是常量

  // 修改过滤商品的逻辑
  const filteredTagProducts = useMemo(() => {
    // 获取当前需要过滤的商品列表
    let productsToFilter = showSearchResults ? searchResults : products;

    // 如果选择了分类，先按分类筛选
    if (selectedCategory && !showSearchResults) {
      productsToFilter = productsToFilter.filter(product => {
        // 如果是一级分类
        if (categories.some(cat => cat.code === selectedCategory)) {
          return product.category === selectedCategory;
        }
        
        // 如果是二级分类
        for (const category of categories) {
          const secondLevel = category.children?.find(sub => sub.code === selectedCategory);
          if (secondLevel) {
            return product.subCategory === selectedCategory;
          }
          
          // 如果是三级分类
          for (const subCategory of category.children || []) {
            const thirdLevel = subCategory.children?.find(third => third.code === selectedCategory);
            if (thirdLevel) {
              return product.thirdCategory === selectedCategory;
            }
          }
        }
        return false;
      });
    }

    // 应用标签过滤
    return productsToFilter.filter(product => {
      const matchesScenes = selectedScenes.length === 0 || 
        selectedScenes.some(scene => product.tags.includes(scene));
      const matchesStyles = selectedStyles.length === 0 || 
        selectedStyles.some(style => product.tags.includes(style));
      return matchesScenes && matchesStyles;
    });
  }, [
    selectedScenes, 
    selectedStyles, 
    showSearchResults, 
    searchResults, 
    selectedCategory
  ]);

  // 获取标签函数
  const getTagsByCategory = useCallback((categoryKey: string | null): AttrGroup[] => {
    // 如果是全部商品或没有选择分类，返回所有一级分类目录的标签组
    if (!categoryKey || categoryKey === 'all') {
      // 初始化一个 Map 来存储合并后的标签组
      const mergedGroups = new Map<string, AttrGroup>();

      // 遍历所有一级分类
      categories.forEach(category => {
        // 确保只处理一级分类
        if (category.attrGroups && Array.isArray(category.attrGroups)) {
          category.attrGroups.forEach(group => {
            if (!mergedGroups.has(group.code)) {
              // 如果这个标签组还不存在，直接添加
              mergedGroups.set(group.code, { ...group });
            } else {
              // 如果标签组已存在，合并属性，去重
              const existingGroup = mergedGroups.get(group.code)!;
              const mergedAttrs = [...existingGroup.attrs];
              
              group.attrs.forEach(attr => {
                if (!mergedAttrs.some(existing => existing.code === attr.code)) {
                  mergedAttrs.push(attr);
                }
              });
              
              mergedGroups.set(group.code, {
                ...existingGroup,
                attrs: mergedAttrs.sort((a, b) => a.sort - b.sort) // 保持属性的排序
              });
            }
          });
        }
      });

      // 将 Map 转换回数组并按 sort 字段排序
      return Array.from(mergedGroups.values())
        .sort((a, b) => a.sort - b.sort);
    }

    // 查找当前分类
    const findCategory = (key: string) => {
      for (const category of categories) {
        if (category.code === key) return category;
        for (const subCategory of category.children || []) {
          if (subCategory.code === key) return subCategory;
          for (const thirdCategory of subCategory.children || []) {
            if (thirdCategory.code === key) return thirdCategory;
          }
        }
      }
      return null;
    };

    const currentCategory = findCategory(categoryKey);
    return currentCategory?.attrGroups || [];
  }, [categories]);

  const handleAllCategoriesClick = () => {
    setShowAllCategories(!showAllCategories);
  };

  // 处理标签选择
  const handleSceneSelect = useCallback((code: string) => {
    setSelectedScenes(prev => 
      prev.includes(code)
        ? prev.filter(s => s !== code)
        : [...prev, code]
    );
  }, []);

  const handleStyleSelect = useCallback((code: string) => {
    setSelectedStyles(prev => 
      prev.includes(code)
        ? prev.filter(s => s !== code)
        : [...prev, code]
    );
  }, []);

  // 清空标签
  const handleClearScenes = useCallback(() => {
    setSelectedScenes([]);
  }, []);

  const handleClearStyles = useCallback(() => {
    setSelectedStyles([]);
  }, []);

  // 修改搜索处理函数
  const handleSearch = (value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      handleBackToAll(); // 空搜索时返回全部商品
      return;
    }

    // 只按商品名称搜索
    const results = products.filter(product => 
      product.name.toLowerCase().includes(trimmedValue.toLowerCase())
    );

    setSearchResults(results);
    setShowSearchResults(true);
    setCurrentPage(1); // 重置分页
    setSortType('default'); // 重置排序
  };

  // 处理搜索框变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    
    if (!value.trim()) {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  };

  // 获取当前分类的完整信息
  const getCurrentCategory = (key: string) => {
    // 查找一级分类
    const firstLevel = categories.find(c => c.code === key);
    if (firstLevel) return firstLevel;

    // 查找二级分类
    for (const category of categories) {
      const secondLevel = category.children?.find(c => c.code === key);
      if (secondLevel) return { ...secondLevel, icon: category.icon };
    }

    // 查找三级分类
    for (const category of categories) {
      for (const subCategory of category.children || []) {
        const thirdLevel = subCategory.children?.find(c => c.code === key);
        if (thirdLevel) return { ...thirdLevel, icon: category.icon };
      }
    }

    return null;
  };

  // 处理查看更多点击
  const handleViewMore = (categoryKey: string) => {
    setSelectedCategory(categoryKey);
    setShowAllCategories(false);
    setActiveKey(categoryKey); // 确保设置为选中状态
    categoryRefs.current[categoryKey].current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  // 修改菜单点击处理函数
  const handleMenuClick = ({ key }: { key: string }) => {
    const firstLevelKey = getFirstLevelKey(key);
    
    // 清空搜索状态
    setSearchText('');
    setShowSearchResults(false);
    setSearchResults([]);
    
    // 设置导航状态
    setActiveKey(firstLevelKey || key);
    if (key === 'all') {
      setShowAllCategories(true);
      setSelectedCategory('');
    } else {
      setShowAllCategories(false);
      setSelectedCategory(key);
    }
    setCurrentPage(1);
    
    // 重置标签选择
    setSelectedScenes([]);
    setSelectedStyles([]);
  };

  // 处理返回全部商品
  const handleBackToAll = () => {
    // 清空搜索状态
    setSearchText('');
    setShowSearchResults(false);
    setSearchResults([]);
    
    // 设置导航状态
    setActiveKey('all');
    setShowAllCategories(true);
    setSelectedCategory('');
    setCurrentPage(1);
  };

  // 修改商品卡片组件
  const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
    const handleCardClick = () => {
      navigate(`/mall/product/${product.id}`);
    };

    const handleExchangeClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // 阻止事件冒泡
      navigate(`/mall/product/${product.id}`);
    };

    return (
      <Card
        hoverable
        className={stylesCss.productCard}
        onClick={handleCardClick}
        cover={
          <div className={stylesCss.imageWrapper}>
            <img alt={product.name} src={product.images[0]} />
            {product.sold > 100 && (
              <div className={stylesCss.hotTag}>
                <FireOutlined /> 热销
              </div>
            )}
          </div>
        }
        actions={[
          <Button 
            type="primary" 
            className={stylesCss.exchangeButton}
            disabled={product.stock === 0}
            onClick={handleExchangeClick}
          >
            <ShoppingCartOutlined />
            {product.stock === 0 ? '暂时售罄' : '立即兑换'}
          </Button>
        ]}
      >
        <div className={stylesCss.productContent}>
          <Tooltip title={product.name}>
            <div className={stylesCss.productTitle}>{product.name}</div>
          </Tooltip>

          <Tooltip title={product.description}>
            <div className={stylesCss.description}>
              {product.description}
            </div>
          </Tooltip>

          <div className={stylesCss.priceStatisticsRow}>
            <div className={stylesCss.priceInfo}>
              <span className={stylesCss.currency}>¥</span>
              <span className={stylesCss.currentPrice}>{product.price}</span>
              <span className={stylesCss.unit}>R</span>
              {product.originalPrice && (
                <span className={stylesCss.originalPrice}>
                  ¥{product.originalPrice}R
                </span>
              )}
            </div>
            <div className={stylesCss.statistics}>
              <span>库存 {product.stock}</span>
              <div className={stylesCss.divider} />
              <span>已售 {product.sold}</span>
            </div>
          </div>

          <div className={stylesCss.tags}>
            {product.tags.slice(0, 4).map(tag => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </div>
      </Card>
    );
  };

  // 修改标题组件
  const CategoryCardTitle: React.FC<CategoryTitleProps> = ({ 
    category, 
    total, 
    onViewMore,
    sortType = 'default',
    onSortChange
  }) => {
    const [sort, setSort] = useState<SortState>(() => {
      if (sortType === 'default') {
        return { field: null, direction: 'desc' };
      }
      const field = sortType.replace(/(Asc|Desc)$/, '') as SortField;
      const direction = sortType.endsWith('Asc') ? 'asc' : 'desc';
      return { field, direction } as SortState;
    });

    const handleSortClick = (field: SortField) => {
      setSort(prevSort => {
        const newDirection: SortDirection = 
          prevSort.field === field && prevSort.direction === 'desc' ? 'asc' : 'desc';
        const newSort: SortState = { field, direction: newDirection };
        onSortChange?.(`${field}${newDirection.charAt(0).toUpperCase() + newDirection.slice(1)}` as SortType);
        return newSort;
      });
    };

    // 获取排序图标
    const getSortIcon = (field: SortField) => {
      if (sort.field !== field) {
        return <SwapOutlined className={stylesCss.sortIcon} />;
      }
      return sort.direction === 'desc' ? 
        <CaretDownOutlined className={`${stylesCss.sortIcon} ${stylesCss.active}`} /> : 
        <CaretUpOutlined className={`${stylesCss.sortIcon} ${stylesCss.active}`} />;
    };

    return (
      <div className={stylesCss.categoryHeader}>
        <div className={stylesCss.categoryTitle}>
          <span className={stylesCss.categoryIcon}>{category.icon}</span>
          <span className={stylesCss.categoryName}>
            {category.name}
            {!onSortChange && <span className={stylesCss.categoryCount}>共 {total} 件商品</span>}
          </span>
        </div>
        <div className={stylesCss.headerRight}>
          {onSortChange && (
            <>
              <div className={stylesCss.sortButtons}>
                <Button
                  className={`${stylesCss.sortButton} ${sort.field === 'price' ? stylesCss.active : ''}`}
                  onClick={() => handleSortClick('price')}
                >
                  价格 {getSortIcon('price')}
                </Button>
                <Button
                  className={`${stylesCss.sortButton} ${sort.field === 'sold' ? stylesCss.active : ''}`}
                  onClick={() => handleSortClick('sold')}
                >
                  销量 {getSortIcon('sold')}
                </Button>
                <Button
                  className={`${stylesCss.sortButton} ${sort.field === 'stock' ? stylesCss.active : ''}`}
                  onClick={() => handleSortClick('stock')}
                >
                  库存 {getSortIcon('stock')}
                </Button>
              </div>
              <div className={stylesCss.verticalDivider} />
              <span className={stylesCss.totalCount}>共 {total} 件商品</span>
            </>
          )}
          {onViewMore && (
            <Button 
              type="link" 
              onClick={() => {
                // 获取当前分类的一级目录
                const parentCategory = categories.find(cat => 
                  cat.children?.some(subCat => 
                    subCat.code === category.code || 
                    subCat.children?.some(thirdCat => thirdCat.code === category.code)
                  )
                );
                if (parentCategory) {
                  setActiveKey(parentCategory.code);
                }
                onViewMore();
              }}
              className={stylesCss.viewMoreBtn}
            >
              查看全部
              <RightOutlined />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // 修改排序处理函数
  const handleSort = (products: Product[], sortType: string) => {
    if (sortType === 'default') return products;

    const match = sortType.match(/([a-z]+)(Asc|Desc)/);
    if (!match) return products;

    const [, field, direction] = match;
    const factor = direction === 'Desc' ? -1 : 1;

    return [...products].sort((a, b) => {
      // 确保字段存在且是数字类型
      const fieldA = a[field as keyof Product];
      const fieldB = b[field as keyof Product];
      
      if (typeof fieldA === 'number' && typeof fieldB === 'number') {
        return (fieldA - fieldB) * factor;
      }
      
      return 0; // 如果不是数字类型，保持原有顺序
    });
  };

  // 渲染分类商品列表
  const renderCategoryProducts = () => {
    if (!selectedCategory) return null;
    
    const currentCategory = getCurrentCategory(selectedCategory);
    if (!currentCategory) return null;

    // 使用新的 filteredTagProducts
    const sortedProducts = handleSort(filteredTagProducts, sortType);
    const pageSize = 12;
    
    return (
      <div 
        ref={categoryRefs.current[selectedCategory]}
        className={stylesCss.categoryProducts}
      >
        <Card 
          className={stylesCss.categoryCard}
          title={
            <CategoryCardTitle 
              category={currentCategory}
              total={filteredTagProducts.length}
              sortType={sortType as SortType}
              onSortChange={setSortType}
            />
          }
        >
          {sortedProducts.length > 0 ? (
            <>
              <Row gutter={[16, 16]}>
                {sortedProducts
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map(product => (
                    <Col span={6} key={product.id}>
                      <ProductCard product={product} />
                    </Col>
                  ))}
              </Row>
              <div className={stylesCss.pagination}>
                <Pagination
                  current={currentPage}
                  total={sortedProducts.length}
                  pageSize={pageSize}
                  onChange={setCurrentPage}
                />
              </div>
            </>
          ) : (
            <div className={stylesCss.emptyState}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className={stylesCss.emptyText}>
                    未找到相关商品
                  </span>
                }
              >
                <Button 
                  type="primary"
                  onClick={handleBackToAll}
                  className={stylesCss.backToAllBtn}
                >
                  查看全部商品
                </Button>
              </Empty>
            </div>
          )}
        </Card>
      </div>
    );
  };

  // 渲染搜索结果
  const renderSearchResults = () => {
    // 使用 filteredProducts 替代直接使用 searchResults
    const sortedResults = handleSort(filteredTagProducts, sortType);
    const pageSize = 12;

    return (
      <div className={stylesCss.searchResults}>
        <Card 
          className={stylesCss.categoryCard}
          title={
            <CategoryCardTitle 
              category={{
                code: 'search',
                name: '搜索结果',
                icon: <SearchOutlined />
              }}
              total={sortedResults.length}
              sortType={sortType as SortType}
              onSortChange={setSortType}
            />
          }
        >
          {sortedResults.length > 0 ? (
            <>
              <Row gutter={[16, 16]}>
                {sortedResults
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map(product => (
                    <Col span={6} key={product.id}>
                      <ProductCard product={product} />
                    </Col>
                  ))}
              </Row>
              <div className={stylesCss.pagination}>
                <Pagination
                  current={currentPage}
                  total={sortedResults.length}
                  pageSize={pageSize}
                  onChange={setCurrentPage}
                />
              </div>
            </>
          ) : (
            <div className={stylesCss.emptyState}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div className={stylesCss.emptyText}>
                    <Paragraph>
                      <Text strong>未找到"{searchText}"相关商品</Text>
                    </Paragraph>
                    <Paragraph>
                      <Text type="secondary">建议您：</Text>
                    </Paragraph>
                    <ul className={stylesCss.suggestionList}>
                      <li>
                        <Text type="secondary">检查输入是否正确</Text>
                      </li>
                      <li>
                        <Text type="secondary">使用其他相关词语搜索</Text>
                      </li>
                    </ul>
                  </div>
                }
              >
                <Button 
                  type="primary"
                  onClick={handleBackToAll}
                  className={stylesCss.backToAllBtn}
                >
                  查看全部商品
                </Button>
              </Empty>
            </div>
          )}
        </Card>
      </div>
    );
  };

  // 修改 TagFilter 组件
  const TagFilter: React.FC<{
    tagGroup: AttrGroup;
    selectedTags: string[];
    onTagSelect: (tag: string) => void;
    onClear: () => void;
  }> = ({ tagGroup, selectedTags, onTagSelect, onClear }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [needsExpansion, setNeedsExpansion] = useState(false);

    // 检测是否需要展开按钮
    useEffect(() => {
      if (contentRef.current) {
        const needsToExpand = contentRef.current.scrollHeight > contentRef.current.clientHeight;
        setNeedsExpansion(needsToExpand);
        // 如果有选中的标签且需要展开，则自动展开
        if (selectedTags.length > 0 && needsToExpand) {
          setIsExpanded(true);
        }
      }
    }, [tagGroup.attrs, selectedTags]);

    return (
      <div className={stylesCss.tagFilterSection}>
        <div className={stylesCss.tagFilterHeader}>
          <span className={stylesCss.tagFilterTitle}>{tagGroup.name}</span>
        </div>
        <div 
          ref={contentRef}
          className={`${stylesCss.tagFilterContent} ${isExpanded ? stylesCss.expanded : ''}`}
        >
          <div className={stylesCss.tagList}>
            {tagGroup.attrs.map((tag: Attr) => (
              <Tag
                key={tag.code}
                className={`${stylesCss.filterTag} ${selectedTags.includes(tag.code) ? stylesCss.active : ''}`}
                onClick={() => onTagSelect(tag.code)}
              >
                {tag.name}
              </Tag>
            ))}
            {selectedTags.length > 0 && (
              <Tag
                className={stylesCss.clearTag}
                onClick={onClear}
              >
                清空
              </Tag>
            )}
          </div>
          {needsExpansion && (
            <Button 
              type="link" 
              className={stylesCss.expandButton}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '收起' : '展开'} 
              {isExpanded ? <CaretUpOutlined /> : <CaretDownOutlined />}
            </Button>
          )}
        </div>
      </div>
    );
  };

  // 修改渲染标签过滤器的容器
  const renderTagFilters = useCallback(() => {
    const currentTags = getTagsByCategory(activeKey === 'all' ? null : selectedCategory);
    
    if (!currentTags || (!currentTags.length)) {
      return null;
    }

    return (
      <div className={stylesCss.filterContainer}>
        <div className={stylesCss.filterHeader}>
        {currentTags.map(tagGroup => (
          <TagFilter
            key={tagGroup.code}
            tagGroup={tagGroup}
            selectedTags={tagGroup.code === 'scene' ? selectedScenes : selectedStyles}
            onTagSelect={tagGroup.code === 'scene' ? handleSceneSelect : handleStyleSelect}
            onClear={tagGroup.code === 'scene' ? handleClearScenes : handleClearStyles}
          />
        ))}
        </div>
      </div>
    );
  }, [
    activeKey,
    selectedCategory,
    selectedScenes,
    selectedStyles,
    getTagsByCategory,
    handleSceneSelect,
    handleStyleSelect,
    handleClearScenes,
    handleClearStyles
  ]);

  // 添加 getFirstLevelKey 函数
  const getFirstLevelKey = (key: string) => {
    // 如果是全部商品，直接返回
    if (key === 'all') return key;
    
    // 如果是一级分类，直接返回
    if (categories.find(c => c.code === key)) {
      return key;
    }
    
    // 查找二级分类所属的一级分类
    for (const category of categories) {
      if (category.children?.some(sub => sub.code === key)) {
        return category.code;
      }
      // 查找三级分类所属的一级分类
      for (const subCategory of category.children || []) {
        if (subCategory.children?.some(third => third.code === key)) {
          return category.code;
        }
      }
    }
    return key; // 如果找不到对应的一级分类，返回原key
  };

  // 修改渲染全部商品的逻辑
  const renderAllCategories = () => {
    return (
      <div className={stylesCss.allCategories}>
        <Row gutter={[16, 16]}>
          {categories.map(category => {
            // 获取当前分类下的商品，并应用标签过滤
            const categoryProducts = filteredTagProducts.filter(product => 
              product.category === category.code ||
              category.children?.some(subCat => 
                product.subCategory === subCat.code ||
                subCat.children?.some(thirdCat => 
                  product.thirdCategory === thirdCat.code
                )
              )
            );

            return (
              <Col span={24} key={category.code}>
                <Card 
                  className={stylesCss.categoryCard}
                  title={
                    <CategoryCardTitle 
                      category={category}
                      total={categoryProducts.length}
                      onViewMore={() => handleViewMore(category.code)}
                    />
                  }
                >
                  <Row gutter={[16, 16]}>
                    {categoryProducts.slice(0, 4).map(product => (
                      <Col span={6} key={product.id}>
                        <ProductCard product={product} />
                      </Col>
                    ))}
                  </Row>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    );
  };

  return (
    <Layout>
      <Header className={stylesCss.header}>
        <Row align="middle">
          <Col span={17}>
            <Menu 
              mode="horizontal" 
              className={stylesCss.menu}
              selectedKeys={[activeKey]}
              onClick={handleMenuClick}
              selectable={true}
            >
              <Menu.Item key="all" icon={<BarsOutlined />}>
                全部商品
              </Menu.Item>
              {(categories || []).map(category => (
                <Menu.SubMenu 
                  key={category.code} 
                  icon={category.icon} 
                  title={category.name}
                  onTitleClick={({ key }) => handleMenuClick({ key })} // 添加一级菜单标题点击处理
               >
                  {category.children?.map(subCategory => (
                    <Menu.SubMenu 
                      key={subCategory.code} 
                      title={subCategory.name}
                      onTitleClick={({ key }) => handleMenuClick({ key })} // 添加二级菜单标题点击处理
                    >
                      {subCategory.children?.map(item => (
                        <Menu.Item key={item.code}>
                          {item.name}
                        </Menu.Item>
                      ))}
                    </Menu.SubMenu>
                  ))}
                </Menu.SubMenu>
              ))}
            </Menu>
          </Col>
          <Col span={6}>
            <div className={stylesCss.searchWrapper}>
              <Search
                placeholder="请输入商品名称"
                value={searchText}
                onChange={handleSearchChange}
                onSearch={handleSearch}
                enterButton
                allowClear
                className={stylesCss.search}
              />
            </div>
          </Col>
        </Row>
      </Header>
      {renderTagFilters()}
      <div className={stylesCss.content}>
        {showSearchResults ? (
          renderSearchResults()
        ) : showAllCategories ? (
          renderAllCategories()  // 使用新的渲染函数
        ) : (
          renderCategoryProducts()
        )}
      </div>
    </Layout>
  )
};

export default MallIndex;