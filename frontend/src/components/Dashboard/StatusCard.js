import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon
} from '@mui/icons-material';

const StatusCard = ({ 
  title, 
  value, 
  icon, 
  color = 'primary', 
  trend, 
  subtitle,
  progress,
  loading = false 
}) => {
  // Render trend indicator
  const renderTrend = () => {
    if (!trend) return null;

    const { direction, value: trendValue, label } = trend;
    
    let trendIcon;
    let trendColor;
    
    switch (direction) {
      case 'up':
        trendIcon = <TrendingUpIcon fontSize="small" />;
        trendColor = 'success';
        break;
      case 'down':
        trendIcon = <TrendingDownIcon fontSize="small" />;
        trendColor = 'error';
        break;
      default:
        trendIcon = <TrendingFlatIcon fontSize="small" />;
        trendColor = 'default';
    }

    return (
      <Chip
        icon={trendIcon}
        label={`${trendValue}${label ? ` ${label}` : ''}`}
        size="small"
        color={trendColor}
        variant="outlined"
        sx={{ mt: 1 }}
      />
    );
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              gutterBottom
              sx={{ fontWeight: 500 }}
            >
              {title}
            </Typography>
            
            <Typography 
              variant="h4" 
              component="div" 
              sx={{ 
                fontWeight: 'bold',
                color: `${color}.main`,
                mb: 1
              }}
            >
              {loading ? '...' : value}
            </Typography>
            
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            
            {renderTrend()}
          </Box>
          
          <Avatar 
            sx={{ 
              bgcolor: `${color}.main`,
              width: 56,
              height: 56
            }}
          >
            {icon}
          </Avatar>
        </Box>
        
        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              color={color}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatusCard;