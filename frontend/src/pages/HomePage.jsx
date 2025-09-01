import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Row,
    Col,
    Card,
    Button,
    Typography,
    Input,
    Carousel,
    Statistic,
    Tag,
    Avatar,
    Space,
    Divider
} from 'antd';
import {
    SearchOutlined,
    CalendarOutlined,
    UserOutlined,
    TrophyOutlined,
    BookOutlined,
    TeamOutlined,
    RocketOutlined,
    StarOutlined,
    EyeOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import dayjs from 'dayjs';
import Lottie from 'lottie-react';

// Components
import EventCard from '../components/events/EventCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

// Services
import { eventService } from '../services/eventService';
import { userService } from '../services/userService';

// Hooks
import { useAuth } from '../hooks/useAuth';

// Animations
import heroAnimation from '../assets/animations/hero-animation.json';
import eventsAnimation from '../assets/animations/events-animation.json';

const { Title, Paragraph } = Typography;
const { Search } = Input;

const HomePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [featuredEvents, setFeaturedEvents] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchHomeData();
    }, []);

    const fetchHomeData = async () => {
        try {
            setLoading(true);
            const [featured, upcoming, systemStats] = await Promise.all([
                eventService.getFeaturedEvents(6),
                eventService.getUpcomingEvents(8),
                eventService.getSystemStats()
            ]);

            setFeaturedEvents(featured.data || []);
            setUpcomingEvents(upcoming.data || []);
            setStats(systemStats.data || {});
        } catch (err) {
            setError('Failed to load homepage data');
            console.error('Homepage data fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (value) => {
        if (value.trim()) {
            navigate(`/events?search=${encodeURIComponent(value)}`);
        }
    };

    const fadeInUp = {
        initial: { opacity: 0, y: 60 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 }
    };

    const staggerChildren = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    if (error) {
        return <ErrorMessage message={error} />;
    }

    return (
        <>
            <Helmet>
                <title>Student Event Management - Discover Amazing Events</title>
                <meta name="description" content="Join exciting events, workshops, and activities designed for students. Discover opportunities to learn, network, and grow." />
                <meta name="keywords" content="student events, workshops, conferences, networking, education, Vietnam" />
            </Helmet>

            <div className="homepage">
                {/* Hero Section */}
                <section className="hero-section bg-gradient-to-br from-blue-600 to-purple-700 text-white">
                    <div className="container mx-auto px-4 py-16">
                        <Row gutter={[48, 48]} align="middle" className="min-h-[500px]">
                            <Col xs={24} lg={12}>
                                <motion.div {...fadeInUp}>
                                    <Title level={1} className="text-white text-4xl md:text-5xl font-bold mb-4">
                                        Khám phá các sự kiện
                                        <span className="text-yellow-300"> tuyệt vời</span> dành cho sinh viên
                                    </Title>
                                    <Paragraph className="text-xl text-blue-100 mb-8">
                                        Tham gia các workshop, hội thảo và hoạt động thú vị.
                                        Kết nối, học hỏi và phát triển bản thân cùng cộng đồng sinh viên năng động.
                                    </Paragraph>

                                    <div className="search-container mb-8">
                                        <Search
                                            placeholder="Tìm kiếm sự kiện mà bạn quan tâm..."
                                            size="large"
                                            onSearch={handleSearch}
                                            className="max-w-md"
                                            enterButton={
                                                <Button type="primary" size="large" icon={<SearchOutlined />}>
                                                    Tìm kiếm
                                                </Button>
                                            }
                                        />
                                    </div>

                                    <Space size="middle" className="hero-actions">
                                        <Button
                                            type="primary"
                                            size="large"
                                            icon={<CalendarOutlined />}
                                            onClick={() => navigate('/events')}
                                            className="bg-yellow-500 border-yellow-500 hover:bg-yellow-600"
                                        >
                                            Xem tất cả sự kiện
                                        </Button>
                                        {!user && (
                                            <Button
                                                size="large"
                                                ghost
                                                icon={<UserOutlined />}
                                                onClick={() => navigate('/register')}
                                            >
                                                Đăng ký ngay
                                            </Button>
                                        )}
                                    </Space>
                                </motion.div>
                            </Col>

                            <Col xs={24} lg={12}>
                                <motion.div
                                    initial={{ opacity: 0, x: 100 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    className="text-center"
                                >
                                    <Lottie
                                        animationData={heroAnimation}
                                        loop={true}
                                        className="max-w-lg mx-auto"
                                    />
                                </motion.div>
                            </Col>
                        </Row>
                    </div>
                </section>

                {/* Statistics Section */}
                <section className="stats-section py-16 bg-gray-50">
                    <div className="container mx-auto px-4">
                        <motion.div {...staggerChildren}>
                            <Row gutter={[32, 32]}>
                                <Col xs={12} sm={6}>
                                    <motion.div {...fadeInUp}>
                                        <Card className="text-center hover:shadow-lg transition-shadow">
                                            <TrophyOutlined className="text-4xl text-yellow-500 mb-2" />
                                            <Statistic
                                                title="Sự kiện đã tổ chức"
                                                value={stats.totalEvents || 0}
                                                valueStyle={{ color: '#f59e0b' }}
                                            />
                                        </Card>
                                    </motion.div>
                                </Col>

                                <Col xs={12} sm={6}>
                                    <motion.div {...fadeInUp}>
                                        <Card className="text-center hover:shadow-lg transition-shadow">
                                            <TeamOutlined className="text-4xl text-blue-500 mb-2" />
                                            <Statistic
                                                title="Sinh viên tham gia"
                                                value={stats.totalParticipants || 0}
                                                valueStyle={{ color: '#3b82f6' }}
                                            />
                                        </Card>
                                    </motion.div>
                                </Col>

                                <Col xs={12} sm={6}>
                                    <motion.div {...fadeInUp}>
                                        <Card className="text-center hover:shadow-lg transition-shadow">
                                            <BookOutlined className="text-4xl text-green-500 mb-2" />
                                            <Statistic
                                                title="Chứng chỉ đã cấp"
                                                value={stats.totalCertificates || 0}
                                                valueStyle={{ color: '#10b981' }}
                                            />
                                        </Card>
                                    </motion.div>
                                </Col>

                                <Col xs={12} sm={6}>
                                    <motion.div {...fadeInUp}>
                                        <Card className="text-center hover:shadow-lg transition-shadow">
                                            <RocketOutlined className="text-4xl text-purple-500 mb-2" />
                                            <Statistic
                                                title="Hoạt động tích cực"
                                                value={stats.activeEvents || 0}
                                                valueStyle={{ color: '#8b5cf6' }}
                                            />
                                        </Card>
                                    </motion.div>
                                </Col>
                            </Row>
                        </motion.div>
                    </div>
                </section>

                {/* Featured Events Section */}
                {featuredEvents.length > 0 && (
                    <section className="featured-events-section py-16">
                        <div className="container mx-auto px-4">
                            <motion.div {...fadeInUp}>
                                <div className="text-center mb-12">
                                    <Title level={2} className="mb-4">
                                        <StarOutlined className="text-yellow-500 mr-3" />
                                        Sự kiện nổi bật
                                    </Title>
                                    <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
                                        Khám phá những sự kiện được đánh giá cao và thu hút nhiều sự quan tâm từ cộng đồng sinh viên
                                    </Paragraph>
                                </div>

                                <Carousel
                                    autoplay
                                    dots={{ className: 'custom-dots' }}
                                    slidesToShow={3}
                                    slidesToScroll={1}
                                    responsive={[
                                        { breakpoint: 1024, settings: { slidesToShow: 2 } },
                                        { breakpoint: 768, settings: { slidesToShow: 1 } }
                                    ]}
                                >
                                    {featuredEvents.map((event) => (
                                        <div key={event._id} className="px-3">
                                            <EventCard
                                                event={event}
                                                featured
                                                className="h-full"
                                            />
                                        </div>
                                    ))}
                                </Carousel>

                                <div className="text-center mt-8">
                                    <Button
                                        type="primary"
                                        size="large"
                                        onClick={() => navigate('/events?featured=true')}
                                    >
                                        Xem thêm sự kiện nổi bật
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    </section>
                )}

                {/* Upcoming Events Section */}
                {upcomingEvents.length > 0 && (
                    <section className="upcoming-events-section py-16 bg-gray-50">
                        <div className="container mx-auto px-4">
                            <motion.div {...fadeInUp}>
                                <Row gutter={[48, 48]}>
                                    <Col xs={24} lg={8}>
                                        <div className="sticky top-8">
                                            <Title level={2} className="mb-4">
                                                <ClockCircleOutlined className="text-blue-500 mr-3" />
                                                Sự kiện sắp diễn ra
                                            </Title>
                                            <Paragraph className="text-gray-600 mb-6">
                                                Đừng bỏ lỡ những cơ hội tuyệt vời để học hỏi và kết nối.
                                                Đăng ký ngay để đảm bảo chỗ của bạn!
                                            </Paragraph>

                                            <div className="mb-6">
                                                <Lottie
                                                    animationData={eventsAnimation}
                                                    loop={true}
                                                    className="max-w-xs"
                                                />
                                            </div>

                                            <Button
                                                type="primary"
                                                size="large"
                                                block
                                                onClick={() => navigate('/events')}
                                                icon={<EyeOutlined />}
                                            >
                                                Xem tất cả sự kiện
                                            </Button>
                                        </div>
                                    </Col>

                                    <Col xs={24} lg={16}>
                                        <motion.div {...staggerChildren}>
                                            <Row gutter={[24, 24]}>
                                                {upcomingEvents.map((event, index) => (
                                                    <Col xs={24} md={12} key={event._id}>
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 50 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ duration: 0.5, delay: index * 0.1 }}
                                                        >
                                                            <EventCard
                                                                event={event}
                                                                compact
                                                                showQuickActions
                                                            />
                                                        </motion.div>
                                                    </Col>
                                                ))}
                                            </Row>
                                        </motion.div>
                                    </Col>
                                </Row>
                            </motion.div>
                        </div>
                    </section>
                )}

                {/* Categories Section */}
                <section className="categories-section py-16">
                    <div className="container mx-auto px-4">
                        <motion.div {...fadeInUp}>
                            <div className="text-center mb-12">
                                <Title level={2} className="mb-4">Khám phá theo danh mục</Title>
                                <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
                                    Tìm kiếm sự kiện phù hợp với sở thích và ngành học của bạn
                                </Paragraph>
                            </div>

                            <Row gutter={[24, 24]}>
                                {[
                                    { name: 'Workshop', icon: '🛠️', color: '#1890ff', count: stats.workshopCount || 0 },
                                    { name: 'Hội thảo', icon: '🎤', color: '#52c41a', count: stats.seminarCount || 0 },
                                    { name: 'Thể thao', icon: '⚽', color: '#fa8c16', count: stats.sportsCount || 0 },
                                    { name: 'Văn hóa', icon: '🎭', color: '#eb2f96', count: stats.culturalCount || 0 },
                                    { name: 'Nghề nghiệp', icon: '💼', color: '#722ed1', count: stats.careerCount || 0 },
                                    { name: 'Tình nguyện', icon: '❤️', color: '#f5222d', count: stats.volunteerCount || 0 }
                                ].map((category, index) => (
                                    <Col xs={12} sm={8} md={4} key={category.name}>
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.5, delay: index * 0.1 }}
                                        >
                                            <Card
                                                hoverable
                                                className="text-center cursor-pointer h-full"
                                                onClick={() => navigate(`/events?category=${category.name}`)}
                                                bodyStyle={{ padding: '24px 16px' }}
                                            >
                                                <div className="text-4xl mb-3">{category.icon}</div>
                                                <Title level={4} style={{ color: category.color, marginBottom: 8 }}>
                                                    {category.name}
                                                </Title>
                                                <Tag color={category.color}>
                                                    {category.count} sự kiện
                                                </Tag>
                                            </Card>
                                        </motion.div>
                                    </Col>
                                ))}
                            </Row>
                        </motion.div>
                    </div>
                </section>

                {/* Testimonials Section */}
                <section className="testimonials-section py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div className="container mx-auto px-4">
                        <motion.div {...fadeInUp}>
                            <div className="text-center mb-12">
                                <Title level={2} className="text-white mb-4">
                                    Sinh viên nói gì về chúng tôi
                                </Title>
                                <Paragraph className="text-xl text-blue-100 max-w-2xl mx-auto">
                                    Hàng ngàn sinh viên đã tham gia và có những trải nghiệm tuyệt vời
                                </Paragraph>
                            </div>

                            <Carousel autoplay dots={{ className: 'white-dots' }}>
                                {[
                                    {
                                        quote: "Tôi đã học được rất nhiều từ các workshop về lập trình. Giảng viên nhiệt tình và nội dung rất thực tế.",
                                        author: "Nguyễn Văn A",
                                        role: "Sinh viên CNTT",
                                        avatar: "https://i.pravatar.cc/64?img=1"
                                    },
                                    {
                                        quote: "Các sự kiện tình nguyện giúp tôi phát triển kỹ năng mềm và có cơ hội đóng góp cho cộng đồng.",
                                        author: "Trần Thị B",
                                        role: "Sinh viên Kinh tế",
                                        avatar: "https://i.pravatar.cc/64?img=2"
                                    },
                                    {
                                        quote: "Platform này thật sự hữu ích! Tôi có thể dễ dàng tìm và đăng ký các sự kiện phù hợp với mình.",
                                        author: "Lê Văn C",
                                        role: "Sinh viên Y khoa",
                                        avatar: "https://i.pravatar.cc/64?img=3"
                                    }
                                ].map((testimonial, index) => (
                                    <div key={index} className="px-8">
                                        <Card className="max-w-3xl mx-auto bg-white/10 border-0 backdrop-blur-sm">
                                            <div className="text-center">
                                                <blockquote className="text-lg text-white/90 mb-6 italic">
                                                    "{testimonial.quote}"
                                                </blockquote>
                                                <div className="flex items-center justify-center space-x-4">
                                                    <Avatar
                                                        src={testimonial.avatar}
                                                        size={64}
                                                        className="border-2 border-white/20"
                                                    />
                                                    <div className="text-left">
                                                        <div className="font-semibold text-white">
                                                            {testimonial.author}
                                                        </div>
                                                        <div className="text-blue-200">
                                                            {testimonial.role}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                ))}
                            </Carousel>
                        </motion.div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="cta-section py-16">
                    <div className="container mx-auto px-4">
                        <motion.div {...fadeInUp}>
                            <Card className="bg-gradient-to-r from-yellow-400 to-orange-500 border-0 text-center">
                                <Title level={2} className="text-white mb-4">
                                    Sẵn sàng bắt đầu hành trình của bạn?
                                </Title>
                                <Paragraph className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                                    Tham gia cùng hàng ngàn sinh viên khác để khám phá những cơ hội tuyệt vời,
                                    học hỏi kỹ năng mới và mở rộng mạng lưới kết nối.
                                </Paragraph>

                                <Space size="large" className="flex-wrap justify-center">
                                    {!user ? (
                                        <>
                                            <Button
                                                type="primary"
                                                size="large"
                                                onClick={() => navigate('/register')}
                                                className="bg-white text-orange-500 border-0 hover:bg-gray-100 min-w-[150px]"
                                            >
                                                Đăng ký ngay
                                            </Button>
                                            <Button
                                                size="large"
                                                ghost
                                                onClick={() => navigate('/login')}
                                                className="text-white border-white hover:bg-white hover:text-orange-500 min-w-[150px]"
                                            >
                                                Đăng nhập
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            type="primary"
                                            size="large"
                                            onClick={() => navigate('/events')}
                                            className="bg-white text-orange-500 border-0 hover:bg-gray-100 min-w-[200px]"
                                            icon={<CalendarOutlined />}
                                        >
                                            Khám phá sự kiện ngay
                                        </Button>
                                    )}
                                </Space>
                            </Card>
                        </motion.div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default HomePage;