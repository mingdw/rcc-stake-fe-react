import React, { FC, useState, useEffect } from 'react';
import { QuestionOutlined, LogoutOutlined, CheckOutlined, HomeOutlined, AppstoreOutlined, TransactionOutlined, TeamOutlined, UserOutlined, CopyOutlined, DownOutlined ,ShopOutlined} from '@ant-design/icons';
import { MenuProps, Avatar, message, Input } from 'antd';
import { Col, Row, Layout, Menu, Space, Select, Button, Dropdown, Typography } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import classnames from 'classnames';

import mainCss from './MainLayout.module.scss';
import { useTranslation } from 'react-i18next';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useChainId, useChains, useDisconnect, useSwitchChain } from 'wagmi';
import { useAuth } from '../context/AuthContext';
import { formatBalance, shortenAddress } from '../utils/common';

const { Header, Content, Footer } = Layout;
export const HOME_PATH_NAME = "home";
export const SUPLY_PATH_NAME = "suply";
export const SMALL_PATH_NAME = "small";
export const ABOUT_PATH_NAME = "about";

const languges = [{
  value: 'zh',
  label: '简体中文',
},
{
  value: 'en',
  label: 'English',
},
];

// 手动定义链图标
const chainIcons: { [key: number]: string } = {
  1: 'https://example.com/eth-icon.png', // Ethereum
  56: 'https://example.com/bsc-icon.png', // Binance Smart Chain
  137: 'https://example.com/polygon-icon.png', // Polygon
  // 添加其他链的图标
};

const MainLayout: FC = () => {
  const chainId = useChainId();
  type MenuItem = Required<MenuProps>['items'][number];
  const { openConnectModal } = useConnectModal(); // 调用 useConnectModal
  const { isConnected, address } = useAccount(); // 获取连接状态和地址
  const { disconnect } = useDisconnect(); // 获取 disconnect 方法
  const { data: balance, isLoading, isError, refetch } = useBalance({ address,query:{enabled:true} });
  const { switchChain } = useSwitchChain();
  const chains = useChains(); // 获取可用的链
  const { authData, setAuthData } = useAuth(); // 使用 useAuth 获取 setAuthData 函数

  // 监听账户变化
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
    
  }, []);

  
  // 监听余额变化
  useEffect(() => {
    if (balance && address) {
      const balanceInETH = formatBalance(balance.value.toString() || '0');
      setAuthData({
        balance: balanceInETH,
      });
    }
  }, [balance, address]);

  // 处理账户变化
  const handleAccountsChanged = async (accounts: string[]) => {
    console.log('Account changed:', accounts);
    if (accounts.length === 0) {
      // 用户断开了所有账户
      await handleDisconnectWallet();
    } else {
      // 用户切换了账户
      await handleAccountSwitch(accounts[0]);
    }
  };

  // 处理账户切换
  const handleAccountSwitch = async (newAccount: string) => {
    try {
      // 清理旧的连接状态
      await handleDisconnectWallet();
      // 更新状态为新账户
      setAuthData({
        address: newAccount,
        balance: formatBalance(balance?.value.toString() || '0'), // 新的余额将通过 useBalance 自动获取
        chainID: chainId,
      });
    } catch (error) {
      console.error('Error switching account:', error);
    }
  };

  // 处理断开连接
  const handleDisconnectWallet = async () => {
    try {
      await disconnect();
      // 清理所有状态
      setAuthData({
        address: '',
        balance: '',
        chainID: -1,
        name: '',
        isAdmin: false,
      });
      // 可能需要清理其他状态...
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  // 处理连接钱包
  const handleConnectWallet = async () => {
    if (!isConnected) {
      openConnectModal?.();
    }else{
      //  如果连接成功，setAuthData
      setAuthData({
        address: address,
        balance: formatBalance(balance?.value.toString() || '0'),
        chainID: chainId,
        name: '',
        isAdmin: false,
      });
      console.log(" 连接成功: " + JSON.stringify(authData));
    }
  };


 
  const [current, setCurrent] = useState('home');
  const navigate = useNavigate();


  const { t, i18n } = useTranslation();
  const items: MenuItem[] = [
    {
      label: t('header.nav.home'),
      key: HOME_PATH_NAME,
      icon: <HomeOutlined />,
    },

    {
      label: t('header.nav.suply'),
      key: SUPLY_PATH_NAME,
      icon: <AppstoreOutlined />,
    },

    {
      label: t('header.nav.mall'),
      key: SMALL_PATH_NAME,
      icon: <ShopOutlined />,
    },
    {
      label: t('header.nav.about'),
      key: ABOUT_PATH_NAME,
      icon: <TeamOutlined />
    },

  ];


  const onClick: MenuProps['onClick'] = (e) => {
    console.log('click ', e);
    setCurrent(e.key);
    navigate('/' + e.key);
  };

  const handleChange = (value: string) => {
    console.info("选择语言： ", value);
    i18n.changeLanguage(value);
  };


  const walletStyle = {
    width: '250px',
    height: 'auto',
    backgroundColor: '#fff',
    borderRadius: '10px',
    marginBottom: '20px'
  };



  const handleMenuClick = (key: string) => {
    console.info("select key: " + key);
    if (key == 'disconnect' && isConnected) {
      console.info("disconnect");
      handleDisconnectWallet();
    } else {
      navigate(key);
    }
  };

  const handleNetworkChange = async (value: string) => {
    console.info("切换网络： ", value);
    const networkId = parseInt(value, 10); // 将字符串转换为数字
    try {
      await switchChain({ chainId: networkId }); // 等待网络切换完成
      await refetch(); // 手动调用 refetch 函数
    
      const balanceInETH = formatBalance(balance?.value.toString() || '0');
      console.info("切换网络成功！！！+ 连接状态： " +isConnected + " 余额： " + balanceInETH);
      await setAuthData({
        address: address,
        balance: balanceInETH,
        chainID: networkId,
        name: '',
        isAdmin: false,
      });
    } catch (error) {
      console.error('Error occurred during network switch or balance fetch:', error);
      message.error('切换网络或更新余额时出错，请重试');
    }
  };


  interface UserAvatarProps {
    size?: number; // 可选的图标大小
  }

  const UserAvatar: React.FC<UserAvatarProps> = ({ size = 22 }) => {
    return (
      <Avatar
        style={{
          color: 'white',
          backgroundColor: 'gray',
          fontSize: `${size}px`, // 根据传入的大小调整字体大小
          width: size,
          height: size,
        }}
        icon={<UserOutlined style={{ fontSize: size }} />}
      />
    );
  };


  //登录成功后，显示钱包相关信息
  const WalletInfo = () => {
    const { Option } = Select;
    const [isCopy, setIsCopy] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(shortenAddress(address || ''));
        setIsCopy(true);
        message.success('地址复制成功！');

        // 2秒后重置复制图标状态
        setTimeout(() => {
          setIsCopy(false);
        }, 2000);
      } catch (err) {
        message.error('复制失败，请重试');
      }
    };
    const accountMenu = [
      {
        key: 'account',
        title: <Typography onClick={() => handleMenuClick('/admin/profile/info')}>个人中心</Typography>,
        icon: <UserOutlined className='text-info' />,
        children: [],
      },

      {
        key: 'contract',
        title: <Typography onClick={() => handleMenuClick('/admin/profile/balance')}>合约管理</Typography>,
        icon: <TransactionOutlined className='text-info' />,
        children: [],
      },
      {
        key: 'faqs',
        title: <Typography onClick={() => handleMenuClick('/about?key=faqs')}>常见问题</Typography>,
        icon: <QuestionOutlined className='text-info' />,
        children: [],
      },
      {
        key: 'disconnect2',
        title: '',

      },
      {
        key: 'disconnect',
        title: <Typography onClick={() => handleMenuClick('disconnect')}>退出登录</Typography>,
        icon: <LogoutOutlined className='text-danger' />,
        children: [],
      },

    ];

    return (
      <Space direction="vertical" style={walletStyle} size={10}>
        <Space style={{ display: 'flex', alignItems: 'center', marginLeft: '10px', marginTop: '20px', textAlign: 'center' }} direction="vertical">
          <Row style={{ textAlign: 'center', marginBottom: '10px' }}>
            <UserAvatar size={40} />
          </Row>
          <Row>
            <Typography.Text>{shortenAddress(address || '')}</Typography.Text>
          </Row>
          {isCopy ?
            <CheckOutlined className='text-success' /> :
            <a onClick={handleCopy} style={{ cursor: 'pointer' }}>
              <CopyOutlined className='text-defult' />
            </a>
          }

        </Space>
        <div style={{ textAlign: 'center' }}>
          <Row>
            <Col span={8}>
              <span className='text-danger' style={{ fontSize: '12px' }}>
                {balance ? formatBalance(balance.value.toString()) : 0} ETH
              </span><br />
              <span style={{ fontSize: '10px', color: 'gray' }}>
                余额
              </span>
            </Col>
            <Col span={8}>
              <span className='text-danger' style={{ fontSize: '12px' }}>
                {balance ? formatBalance(balance.value.toString()) : 0} ETH
              </span><br />
              <span style={{ fontSize: '10px', color: 'gray' }}>
                质押
              </span>
            </Col>
            <Col span={8}>
              <span className='text-danger' style={{ fontSize: '12px' }}>
                126 R
              </span><br />
              <span style={{ fontSize: '10px', color: 'gray' }}>
                收益
              </span>
            </Col>
          </Row>
        </div>

        <div style={{ textAlign: 'left' }}>
          <Menu
            items={accountMenu.map(menuItem => ({
              key: menuItem.key,
              label: menuItem.title,
              icon: menuItem.icon,
              children: menuItem.children ? menuItem.children.map(subMenuItem => ({
                // Handle subMenuItem here if needed
              })) : undefined,
            }))}

          />
        </div>

      </Space>
    );
  };


  return (

    <Layout>
      <Header style={{ display: 'flex', backgroundColor: 'white', height: '15%' }}>
        <Row style={{ width: '100%', alignItems: 'center' }}>
          <Col style={{ textAlign: 'left', width: '30%' }} >
          <span className="iconfont" style={{color:'#1296DB',fontSize:'34px'}}>&#xe610;</span>
            <a style={{ marginLeft: '10px' }} href={HOME_PATH_NAME}>
              <span className={classnames(mainCss.logoStyle, mainCss.hcqFont, mainCss.hcqStyle1)}>{t('header.logo')}
              </span> 
            </a>
          </Col>
          <Col style={{ width: '40%' }}>
            <Menu onClick={onClick} selectedKeys={[current]} mode="horizontal" items={items} />
          </Col>

          <Col style={{ width: '30%', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Select size={"middle"} defaultValue="简体中文" onChange={handleChange} options={languges} style={{ marginLeft: '10px' }} />
              {isConnected ? (

                <Space style={{ marginLeft: '20px' }}>
                  <Select defaultValue={chains[0].name} options={chains.map((chain) => ({ label: chain.name, value: chain.id, prefixIcon: <img src={chainIcons[chain.id]} alt={chain.name} style={{ width: 20, height: 20 }} /> }))} onSelect={handleNetworkChange} />
                  <Dropdown
                    dropdownRender={menu => (
                      <WalletInfo />
                    )}
                    placement="bottom"
                  >
                    <Input readOnly style={{ width: '70%' }} prefix={<UserAvatar />} defaultValue={shortenAddress(address || '')} suffix={<DownOutlined />} />

                  </Dropdown>
                </Space>

              ) : (
                <div>
                  <Button size={"middle"} icon={<UserOutlined />} onClick={handleConnectWallet} style={{ marginLeft: '10px' }}>
                    {t('walletconnect')}
                  </Button>

                </div>

              )}
            </div>
          </Col>
        </Row>
      </Header>
      <Content style={{alignItems:'center',justifyContent:'center'}}>
        {/* 确保 Outlet 只有一个父元素包裹 */}
        <div>
          <Outlet />
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 10 }}>
          <a href="#">服务条款</a>
          <span style={{ margin: '0 10px' }}>|</span>
          <a href="#">隐私政策</a>
          <span style={{ margin: '0 10px' }}>|</span>
          <a href="#">联系我们</a>
        </div>
        <div>版权所有 &copy; 2025 RCC 平台</div>
      </Footer>
    </Layout>

  );
};

export default MainLayout;